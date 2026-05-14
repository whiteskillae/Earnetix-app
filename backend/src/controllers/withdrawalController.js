const mongoose = require('mongoose');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const AdminLog = require('../models/AdminLog');
const logger = require('../utils/logger');
const Announcement = require('../models/Announcement');
const { freezePoints, unfreezePoints, deductPointsForWithdrawal } = require('../services/pointService');

const POINTS_PER_DOLLAR = 100;
const MIN_WITHDRAWAL_POINTS = 3000; // $30

// ─── USER: SAVE BANK DETAILS ──────────────────────────
const saveBankDetails = async (req, res, next) => {
  try {
    const { accountName, accountNumber, ifscCode, bankName, upiId } = req.body;
    if (!accountName || !accountNumber || !bankName) {
      return res.status(400).json({ success: false, message: 'Account name, number, and bank name are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.bankDetails = { accountName, accountNumber, ifscCode, bankName, upiId };
    await user.save();

    res.json({ success: true, message: 'Bank details saved securely', data: { bankDetails: user.bankDetails } });
  } catch (error) {
    next(error);
  }
};

// ─── USER: REQUEST WITHDRAWAL (ATOMIC POINT FREEZE) ──
const requestWithdrawal = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { pointsToConvert } = req.body;
    const points = Number(pointsToConvert);

    if (!points || points < MIN_WITHDRAWAL_POINTS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS} points ($${MIN_WITHDRAWAL_POINTS / POINTS_PER_DOLLAR})`,
      });
    }

    if (points % POINTS_PER_DOLLAR !== 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Points must be a multiple of 100' });
    }

    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.kycStatus !== 'verified') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'KYC verification required before withdrawal' });
    }

    if (!user.bankDetails?.accountNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Please save your bank details first' });
    }

    // Check if user already has a pending/processing withdrawal
    const existingPending = await Withdrawal.findOne({ userId: user._id, status: { $in: ['pending', 'processing'] } }).session(session);
    if (existingPending) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'You already have a pending withdrawal request. Please wait for it to be processed.',
      });
    }

    const amountUSD = points / POINTS_PER_DOLLAR;

    // Atomic freeze — validates available balance atomically
    await freezePoints(user._id, points, session);

    const [withdrawal] = await Withdrawal.create([{
      userId: user._id,
      pointsUsed: points,
      amountUSD,
      bankDetails: user.bankDetails,
    }], { session });

    await session.commitTransaction();

    logger.info(`Withdrawal requested: ${points} pts ($${amountUSD}) by ${user.email}`);

    res.status(201).json({
      success: true,
      message: `Withdrawal of $${amountUSD} requested. Your reward will be credited in 3-5 working days.`,
      data: withdrawal,
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.message.includes('Insufficient')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    session.endSession();
  }
};

// ─── USER: GET MY WITHDRAWALS ─────────────────────────
const getMyWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: withdrawals });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: GET ALL WITHDRAWAL REQUESTS ───────────────
const getAllWithdrawals = async (req, res, next) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .populate('userId', 'name email points frozenPoints kycStatus country')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: withdrawals });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: COMPLETE WITHDRAWAL (TRANSACTIONAL) ──────
const completeWithdrawal = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).session(session);
    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    if (withdrawal.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Already completed' });
    }

    // Atomic deduction: points AND frozenPoints decremented in one operation
    await deductPointsForWithdrawal(withdrawal.userId, withdrawal.pointsUsed, session);

    withdrawal.status = 'completed';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = req.body.note || 'Payment completed';
    await withdrawal.save({ session });

    await AdminLog.create([{
      adminId: req.user._id, action: 'withdrawal_complete', targetId: withdrawal._id,
      targetType: 'withdrawal', details: `Completed $${withdrawal.amountUSD} withdrawal for user ${withdrawal.userId}`, ip: req.ip,
    }], { session });

    await session.commitTransaction();

    const user = await User.findById(withdrawal.userId).select('email');
    logger.info(`Withdrawal completed: $${withdrawal.amountUSD} for ${user?.email}`);
    res.json({ success: true, message: `Payment of $${withdrawal.amountUSD} marked as completed` });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ─── ADMIN: REJECT WITHDRAWAL (TRANSACTIONAL UNFREEZE) ─
const rejectWithdrawal = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).session(session);
    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    if (withdrawal.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cannot reject completed withdrawal' });
    }

    // Atomic unfreeze — return points to user's available balance
    await unfreezePoints(withdrawal.userId, withdrawal.pointsUsed, session);

    withdrawal.status = 'rejected';
    withdrawal.adminNote = reason || 'Rejected by admin';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save({ session });

    await AdminLog.create([{
      adminId: req.user._id, action: 'withdrawal_reject', targetId: withdrawal._id,
      targetType: 'withdrawal', details: `Rejected $${withdrawal.amountUSD} withdrawal for user ${withdrawal.userId}: ${reason}`, ip: req.ip,
    }], { session });

    // Create a targeted announcement for the user
    await Announcement.create([{
      title: 'Withdrawal Request Rejected',
      content: `Your withdrawal request for $${withdrawal.amountUSD} has been rejected. Reason: ${reason || 'Bank details mismatch or verification failed'}. Your points have been returned to your wallet. You can request again after correcting the issues.`,
      priority: 'high',
      targetUser: withdrawal.userId,
      createdBy: req.user._id
    }], { session });

    await session.commitTransaction();

    res.json({ success: true, message: 'Withdrawal rejected and points returned to user' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ─── ADMIN: BLOCK USER FROM WITHDRAWAL ────────────────
const blockWithdrawalUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).session(session);
    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    const user = await User.findById(withdrawal.userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBlocked = true;
    user.refreshToken = null;
    await user.save({ session });

    // Unfreeze points since account is now blocked
    await unfreezePoints(user._id, withdrawal.pointsUsed, session);

    withdrawal.status = 'rejected';
    withdrawal.adminNote = 'User account blocked';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save({ session });

    await AdminLog.create([{
      adminId: req.user._id, action: 'withdrawal_block_user', targetId: user._id,
      targetType: 'user', details: `Blocked user ${user.email} during withdrawal review`, ip: req.ip,
    }], { session });

    await session.commitTransaction();

    res.json({ success: true, message: 'User blocked and withdrawal rejected' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

module.exports = {
  saveBankDetails, requestWithdrawal, getMyWithdrawals,
  getAllWithdrawals, completeWithdrawal, rejectWithdrawal, blockWithdrawalUser,
};
