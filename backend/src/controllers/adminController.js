const User = require('../models/User');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const AdminLog = require('../models/AdminLog');
const { awardPoints } = require('../services/pointService');

const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalTasks, totalSubmissions, pendingSubmissions, approvedSubmissions, rejectedSubmissions] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Task.countDocuments(),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'approved' }),
      Submission.countDocuments({ status: 'rejected' }),
    ]);
    res.json({ success: true, data: { totalUsers, totalTasks, totalSubmissions, pendingSubmissions, approvedSubmissions, rejectedSubmissions } });
  } catch (error) { next(error); }
};

const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit);
    const total = await User.countDocuments({ role: 'user' });
    res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

const getSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const submissions = await Submission.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
      .populate('userId', 'name email').populate('taskId', 'title rewardPoints');
    const total = await Submission.countDocuments(filter);
    res.json({ success: true, data: { submissions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

const approveSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('taskId');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.status !== 'pending') return res.status(400).json({ success: false, message: 'Submission already reviewed' });

    submission.status = 'approved';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    submission.canResubmit = false;
    await submission.save();

    await awardPoints(submission.userId, submission.taskId.rewardPoints, req.user._id, submission._id);

    await AdminLog.create({
      adminId: req.user._id, action: 'approve', targetId: submission._id,
      targetType: 'submission', details: `Approved submission for task: ${submission.taskId.title}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Submission approved and points awarded' });
  } catch (error) { next(error); }
};

const rejectSubmission = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const submission = await Submission.findById(req.params.id).populate('taskId');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.status !== 'pending') return res.status(400).json({ success: false, message: 'Submission already reviewed' });

    submission.status = 'rejected';
    submission.rejectionReason = rejectionReason;
    submission.canResubmit = true;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'reject', targetId: submission._id,
      targetType: 'submission', details: `Rejected: ${rejectionReason}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Submission rejected' });
  } catch (error) { next(error); }
};

module.exports = { getDashboard, getUsers, getSubmissions, approveSubmission, rejectSubmission };
