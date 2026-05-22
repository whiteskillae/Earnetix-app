const User = require('../models/User');
const { validateFile, uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const AdminLog = require('../models/AdminLog');
const logger = require('../utils/logger');

// ─── USER: SUBMIT KYC DOCUMENT ─────────────────────────
const submitKyc = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.kycStatus === 'verified') {
      return res.status(400).json({ success: false, message: 'KYC already verified' });
    }

    if (user.kycStatus === 'pending') {
      return res.status(400).json({ success: false, message: 'KYC already submitted and under review' });
    }

    const { documentType, documentNumber } = req.body;
    if (!documentType || !['aadhar', 'passport', 'national_id'].includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Valid document type required (aadhar, passport, or national_id)' });
    }

    if (!documentNumber || documentNumber.trim() === '') {
      return res.status(400).json({ success: false, message: 'Document number is required to prevent fraud.' });
    }

    // Unique KYC check
    const existingDoc = await User.findOne({ kycDocumentNumber: documentNumber });
    if (existingDoc && existingDoc._id.toString() !== user._id.toString()) {
      return res.status(409).json({ success: false, message: 'This document number is already registered to another account. Fraud attempt logged.' });
    }

    const docFile = req.files?.document?.[0] || req.file;
    if (!docFile) {
      return res.status(400).json({ success: false, message: 'Document image is required' });
    }

    // Validate: allow common image formats + PDF
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'bmp'];
    validateFile(docFile, allowedExts, 10 * 1024 * 1024); // Max 10MB

    // Delete old document if re-submitting after rejection
    if (user.kycDocumentPublicId) {
      await deleteFromCloudinary(user.kycDocumentPublicId);
    }

    const uploadResult = await uploadToCloudinary(docFile.buffer, 'earnetix/kyc', docFile.originalname);

    user.kycStatus = 'pending';
    user.kycDocumentUrl = uploadResult.url;
    user.kycDocumentPublicId = uploadResult.publicId;
    user.kycDocumentType = documentType;
    user.kycDocumentNumber = documentNumber.toUpperCase();
    user.kycRejectionReason = null;
    user.kycSubmittedAt = new Date();
    
    // If profile is also complete, activate the account
    if (user.isProfileComplete) {
      user.accountStatus = 'active';
    }
    
    await user.save();

    logger.info(`KYC submitted by user ${user.email} (${documentType})`);

    res.json({
      success: true,
      message: 'KYC document submitted successfully. Verification takes 1-3 working days.',
      data: { kycStatus: user.kycStatus },
    });
  } catch (error) {
    next(error);
  }
};

// ─── USER: GET KYC STATUS ──────────────────────────────
const getKycStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('kycStatus kycDocumentType kycRejectionReason kycSubmittedAt kycVerifiedAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: GET PENDING KYC LIST ───────────────────────
const getPendingKyc = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const users = await User.find({ kycStatus: status, role: 'user' })
      .select('name email country mobileNumber countryCode kycStatus kycDocumentUrl kycDocumentType kycDocumentNumber kycSubmittedAt kycRejectionReason kycVerifiedAt qualifications skills isProfileComplete accountStatus createdAt')
      .sort({ kycSubmittedAt: -1 })
      .limit(200);

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: VERIFY KYC ────────────────────────────────
const verifyKyc = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: `KYC is not in pending state (current: ${user.kycStatus})` });
    }

    user.kycStatus = 'verified';
    user.kycVerifiedAt = new Date();
    user.kycRejectionReason = null;
    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'kyc_verify', targetId: user._id,
      targetType: 'user', details: `KYC verified for ${user.email}`, ip: req.ip,
    });

    logger.info(`KYC verified for user ${user.email} by admin ${req.user._id}`);
    res.json({ success: true, message: 'KYC verified successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: REJECT KYC (ASK TO RESUBMIT) ──────────────
const rejectKyc = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: `KYC is not in pending state (current: ${user.kycStatus})` });
    }

    user.kycStatus = 'rejected';
    user.kycRejectionReason = reason;
    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'kyc_reject', targetId: user._id,
      targetType: 'user', details: `KYC rejected for ${user.email}: ${reason}`, ip: req.ip,
    });

    logger.info(`KYC rejected for user ${user.email}: ${reason}`);
    res.json({ success: true, message: 'KYC rejected. User will be asked to resubmit.' });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: BLOCK USER VIA KYC ─────────────────────────
const blockUserKyc = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block admin' });

    user.isBlocked = true;
    user.kycStatus = 'rejected';
    user.refreshToken = null; // Force logout
    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'kyc_block', targetId: user._id,
      targetType: 'user', details: `User blocked during KYC review: ${user.email}`, ip: req.ip,
    });

    res.json({ success: true, message: 'User blocked and session terminated' });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: GET FULL USER DETAILS FOR KYC REVIEW ───────────
const getFullKycUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-passwordHash -refreshToken -otp -loginHistory'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitKyc, getKycStatus, getPendingKyc, verifyKyc, rejectKyc, blockUserKyc, getFullKycUser };
