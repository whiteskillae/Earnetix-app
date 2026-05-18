const mongoose = require('mongoose');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const AssignedTask = require('../models/AssignedTask');
const AdminLog = require('../models/AdminLog');
const { awardPoints, adjustPointsAtomic } = require('../services/pointService');
const cache = require('../services/cacheService');

const getDashboard = async (req, res, next) => {
  try {
    // Check cache first (60-second TTL for dashboard stats)
    const cached = cache.get('admin_dashboard');
    if (cached) {
      return res.json({ success: true, data: cached, fromCache: true });
    }

    const Withdrawal = require('../models/Withdrawal');
    const [totalUsers, totalTasks, totalSubmissions, pendingSubmissions, approvedSubmissions, rejectedSubmissions, pendingKyc, pendingWithdrawals] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Task.countDocuments(),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'approved' }),
      Submission.countDocuments({ status: 'rejected' }),
      User.countDocuments({ kycStatus: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
    ]);

    const data = { totalUsers, totalTasks, totalSubmissions, pendingSubmissions, approvedSubmissions, rejectedSubmissions, pendingKyc, pendingWithdrawals };

    // Cache dashboard stats for 60 seconds
    cache.set('admin_dashboard', data, 60);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { skill, query } = req.query;

    const filter = { role: 'user' };
    if (skill) filter.skills = skill;
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

const getSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [submissions, total] = await Promise.all([
      Submission.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
        .populate('userId', 'name email').populate('taskId', 'title rewardPoints'),
      Submission.countDocuments(filter),
    ]);
    res.json({ success: true, data: { submissions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

/**
 * TRANSACTIONAL: Approve submission + award points + log — all-or-nothing.
 */
const approveSubmissionTransactional = async (submission, adminId, session = null) => {
  const ownsSession = !session;
  if (ownsSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  
  try {
    submission.status = 'approved';
    submission.reviewedBy = adminId;
    submission.reviewedAt = new Date();
    submission.canResubmit = false;
    await submission.save({ session });

    await awardPoints(submission.userId, submission.taskId.rewardPoints, adminId, submission._id, session);

    if (ownsSession) await session.commitTransaction();
  } catch (error) {
    if (ownsSession) await session.abortTransaction();
    throw error;
  } finally {
    if (ownsSession) session.endSession();
  }
};

const approveSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('taskId');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.status !== 'pending') return res.status(400).json({ success: false, message: 'Submission already reviewed' });

    await approveSubmissionTransactional(submission, req.user._id);

    await AdminLog.create({
      adminId: req.user._id, action: 'approve', targetId: submission._id,
      targetType: 'submission', details: `Approved submission for task: ${submission.taskId.title}`, ip: req.ip,
    });

    cache.del('admin_dashboard');
    res.json({ success: true, message: 'Submission approved and points awarded' });
  } catch (error) {
    next(error);
  }
};

const rejectSubmission = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const submission = await Submission.findById(req.params.id).populate('taskId');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.status !== 'pending') return res.status(400).json({ success: false, message: 'Submission already reviewed' });

    submission.status = 'rejected';
    submission.rejectionReason = rejectionReason;
    // 1 more chance to resubmit (submissionCount 1 -> canResubmit true, submissionCount 2 -> canResubmit false)
    submission.canResubmit = submission.submissionCount < 2;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    // Clean up rejected evidence from Cloudinary
    const { deleteFromCloudinary } = require('../services/uploadService');
    if (submission.imagePublicId) await deleteFromCloudinary(submission.imagePublicId);
    if (submission.filePublicId) await deleteFromCloudinary(submission.filePublicId);

    await AdminLog.create({
      adminId: req.user._id, action: 'reject', targetId: submission._id,
      targetType: 'submission', details: `Rejected: ${rejectionReason}`, ip: req.ip,
    });

    cache.del('admin_dashboard');

    res.json({ success: true, message: 'Submission rejected' });
  } catch (error) { next(error); }
};

const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block admin' });

    user.isBlocked = !user.isBlocked;

    // If blocking, invalidate session
    if (user.isBlocked) {
      user.refreshToken = null;
    }

    await user.save();

    // If blocking, clean up pending/rejected evidence from Cloudinary
    if (user.isBlocked) {
      const { deleteFromCloudinary } = require('../services/uploadService');
      const pendingSubmissions = await Submission.find({
        userId: user._id,
        status: { $in: ['pending', 'rejected'] },
        $or: [{ imagePublicId: { $ne: null } }, { filePublicId: { $ne: null } }]
      });
      for (const sub of pendingSubmissions) {
        if (sub.imagePublicId) await deleteFromCloudinary(sub.imagePublicId);
        if (sub.filePublicId) await deleteFromCloudinary(sub.filePublicId);
      }
    }

    await AdminLog.create({
      adminId: req.user._id, action: user.isBlocked ? 'block' : 'unblock', targetId: user._id,
      targetType: 'user', details: `${user.isBlocked ? 'Blocked' : 'Unblocked'} user: ${user.email}`, ip: req.ip,
    });

    res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, data: user });
  } catch (error) { next(error); }
};

const getTasksWithStats = async (req, res, next) => {
  try {
    const tasks = await Task.find({ isActive: true }).sort({ createdAt: -1 }).lean();

    // Single aggregation query instead of one-per-task (O(N) -> O(1))
    const submissionStats = await Submission.aggregate([
      { $group: { _id: { taskId: '$taskId', status: '$status' }, count: { $sum: 1 } } }
    ]);

    // Build a lookup map: { taskId: { pending: N, approved: N, rejected: N } }
    const statsMap = {};
    submissionStats.forEach(s => {
      const id = s._id.taskId.toString();
      if (!statsMap[id]) statsMap[id] = { pending: 0, approved: 0, rejected: 0, total: 0 };
      statsMap[id][s._id.status] = s.count;
      statsMap[id].total += s.count;
    });

    const tasksWithStats = tasks.map(task => ({
      ...task,
      stats: statsMap[task._id.toString()] || { pending: 0, approved: 0, rejected: 0 },
      totalSubmissions: statsMap[task._id.toString()]?.total || 0,
    }));

    res.json({ success: true, data: tasksWithStats });
  } catch (error) { next(error); }
};

/**
 * ATOMIC: Admin point adjustment using $inc.
 */
const adjustPoints = async (req, res, next) => {
  try {
    const { points, reason } = req.body;

    const delta = Number(points);
    if (isNaN(delta)) {
      return res.status(400).json({ success: false, message: 'Points must be a valid number' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reason is required for audit log' });
    }

    const user = await adjustPointsAtomic(req.params.id, delta);

    await AdminLog.create({
      adminId: req.user._id, action: 'adjust_points', targetId: user._id,
      targetType: 'user', details: `Adjusted points by ${delta}. Reason: ${reason}`, ip: req.ip,
    });

    cache.del('admin_dashboard');

    res.json({ success: true, message: `Points adjusted by ${delta}`, data: user });
  } catch (error) {
    if (error.message.includes('Insufficient') || error.message.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * Bulk Approve Submissions
 */
const approveSubmissionsBulk = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'IDs required' });

    const results = { success: 0, failed: 0 };
    for (const id of ids) {
      try {
        const submission = await Submission.findById(id).populate('taskId userId');
        if (!submission || submission.status !== 'pending') { results.failed++; continue; }
        
        await approveSubmissionTransactional(submission, req.user._id);
        results.success++;
      } catch (err) { results.failed++; }
    }

    cache.del('admin_dashboard');
    res.json({ success: true, message: `Bulk approval complete. Success: ${results.success}, Failed: ${results.failed}` });
  } catch (error) { next(error); }
};

/**
 * Bulk Reject Submissions
 */
const rejectSubmissionsBulk = async (req, res, next) => {
  try {
    const { ids, reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'IDs required' });
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });

    const results = { success: 0, failed: 0 };
    const { deleteFromCloudinary } = require('../services/uploadService');

    for (const id of ids) {
      try {
        const submission = await Submission.findById(id);
        if (!submission || submission.status !== 'pending') { results.failed++; continue; }

        submission.status = 'rejected';
        submission.rejectionReason = reason;
        submission.canResubmit = submission.submissionCount < 2;
        submission.reviewedBy = req.user._id;
        submission.reviewedAt = new Date();
        await submission.save();

        if (submission.imagePublicId) await deleteFromCloudinary(submission.imagePublicId);
        if (submission.filePublicId) await deleteFromCloudinary(submission.filePublicId);
        
        results.success++;
      } catch (err) { results.failed++; }
    }

    cache.del('admin_dashboard');
    res.json({ success: true, message: `Bulk rejection complete. Success: ${results.success}, Failed: ${results.failed}` });
  } catch (error) { next(error); }
};

/**
 * Bulk Block Users
 */
const blockUsersBulk = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'IDs required' });

    const results = { success: 0, failed: 0 };
    const { deleteFromCloudinary } = require('../services/uploadService');

    for (const id of ids) {
      try {
        const user = await User.findById(id);
        if (!user || user.role === 'admin' || user.isBlocked) { results.failed++; continue; }

        user.isBlocked = true;
        user.refreshToken = null;
        await user.save();

        // Clean up evidence
        const pendingSubmissions = await Submission.find({
          userId: user._id,
          status: { $in: ['pending', 'rejected'] },
          $or: [{ imagePublicId: { $ne: null } }, { filePublicId: { $ne: null } }]
        });
        for (const sub of pendingSubmissions) {
          if (sub.imagePublicId) await deleteFromCloudinary(sub.imagePublicId);
          if (sub.filePublicId) await deleteFromCloudinary(sub.filePublicId);
        }

        results.success++;
      } catch (err) { results.failed++; }
    }

    res.json({ success: true, message: `Bulk blocking complete. Success: ${results.success}, Failed: ${results.failed}` });
  } catch (error) { next(error); }
};

const blockUserTemporary = async (req, res, next) => {
  try {
    const { durationHours = 24 } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block admin' });

    const blockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    user.blockedUntil = blockedUntil;
    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'temp_block', targetId: user._id,
      targetType: 'user', details: `Temporarily blocked user for ${durationHours} hours until ${blockedUntil.toISOString()}`, ip: req.ip,
    });

    res.json({ success: true, message: `User blocked for ${durationHours} hours`, data: user });
  } catch (error) { next(error); }
};

const getPendingAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await AssignedTask.find({ status: 'under_review' })
      .populate('assignedUsers', 'name email')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (error) { next(error); }
};

/**
 * TRANSACTIONAL: Approve assigned task + award points + log.
 */
const approveAssignedTask = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const task = await AssignedTask.findById(req.params.id).session(session);
    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.status !== 'under_review') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Task not in review state' });
    }

    const submission = task.submissions[task.submissions.length - 1];
    if (!submission) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'No submission found' });
    }

    task.status = 'completed';
    await task.save({ session });

    await awardPoints(submission.userId, task.rewardPoints, req.user._id, task._id, session);

    await AdminLog.create([{
      adminId: req.user._id, action: 'approve_assigned', targetId: task._id,
      targetType: 'assigned_task', details: `Approved task: ${task.title} for user ${submission.userId}`, ip: req.ip,
    }], { session });

    await session.commitTransaction();

    cache.del('admin_dashboard');

    res.json({ success: true, message: 'Task approved and points awarded' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const rejectAssignedTask = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const task = await AssignedTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== 'under_review') return res.status(400).json({ success: false, message: 'Task not in review state' });

    task.status = 'rejected';
    task.rejectionReason = rejectionReason;
    await task.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'reject_assigned', targetId: task._id,
      targetType: 'assigned_task', details: `Rejected task: ${task.title}. Reason: ${rejectionReason}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Task rejected' });
  } catch (error) { next(error); }
};

/**
 * Get all restricted users (blocked, temp blocked, or KYC rejected)
 */
const getBlockedUsers = async (req, res, next) => {
  try {
    const now = new Date();
    const users = await User.find({
      $or: [
        { isBlocked: true },
        { blockedUntil: { $gt: now } },
        { kycStatus: 'rejected' }
      ],
      role: 'user'
    }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
};

/**
 * Force unblock a user (clears permanent, temporary, and potential KYC blocks)
 */
const unblockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isBlocked = false;
    user.blockedUntil = null;

    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'unblock', targetId: user._id,
      targetType: 'user', details: `Manual full unblock for: ${user.email}`, ip: req.ip,
    });

    res.json({ success: true, message: 'User restrictions cleared', data: user });
  } catch (error) { next(error); }
};

/**
 * ─── DELETE USER (Hard Delete) ────────────────────────
 * Completely removes user + their data from the database.
 * Frees their IP address and device fingerprint so they
 * can register again without any "already registered" error.
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin accounts' });

    const { deleteFromCloudinary } = require('../services/uploadService');

    // 1. Delete KYC document from Cloudinary
    if (user.kycDocumentPublicId) {
      await deleteFromCloudinary(user.kycDocumentPublicId).catch(e => 
        console.warn(`[deleteUser] KYC Cloudinary cleanup failed: ${e.message}`)
      );
    }

    // 2. Delete all submission files from Cloudinary
    const userSubmissions = await Submission.find({ userId: user._id });
    for (const sub of userSubmissions) {
      if (sub.imagePublicId) await deleteFromCloudinary(sub.imagePublicId).catch(() => {});
      if (sub.filePublicId) await deleteFromCloudinary(sub.filePublicId).catch(() => {});
    }

    // 3. Delete all Submission documents
    await Submission.deleteMany({ userId: user._id });

    // 4. Delete all Withdrawal documents
    const Withdrawal = require('../models/Withdrawal');
    await Withdrawal.deleteMany({ userId: user._id });

    // 5. Delete all AssignedTask entries where user was assigned
    await AssignedTask.updateMany(
      { assignedUsers: user._id },
      { $pull: { assignedUsers: user._id } }
    );

    // 6. Log the admin action before deleting (while user._id still exists)
    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_user',
      targetId: user._id,
      targetType: 'user',
      details: `Permanently deleted user: ${user.email} (IP: ${user.registrationIp}, Device: ${user.deviceFingerprint})`,
      ip: req.ip,
    });

    // 7. Hard delete the user — this frees email, IP, and device fingerprint
    await User.findByIdAndDelete(user._id);

    cache.del('admin_dashboard');

    res.json({ 
      success: true, 
      message: `User "${user.name}" (${user.email}) has been permanently deleted. Their IP and device are now free for re-registration.` 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard, getUsers, getSubmissions, approveSubmission, rejectSubmission,
  toggleBlockUser, getTasksWithStats, adjustPoints, blockUserTemporary,
  getPendingAssignedTasks, approveAssignedTask, rejectAssignedTask,
  approveSubmissionsBulk, rejectSubmissionsBulk, blockUsersBulk,
  getBlockedUsers, unblockUser, deleteUser
};
