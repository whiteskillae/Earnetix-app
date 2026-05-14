const User = require('../models/User');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const AssignedTask = require('../models/AssignedTask');
const AdminLog = require('../models/AdminLog');
const { awardPoints } = require('../services/pointService');

const getDashboard = async (req, res, next) => {
  try {
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
    res.json({ success: true, data: { totalUsers, totalTasks, totalSubmissions, pendingSubmissions, approvedSubmissions, rejectedSubmissions, pendingKyc, pendingWithdrawals } });
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

    const users = await User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit);
    const total = await User.countDocuments(filter);
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
    // 1 more chance to resubmit (submissionCount 1 -> canResubmit true, submissionCount 2 -> canResubmit false)
    submission.canResubmit = submission.submissionCount < 2;
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

const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block admin' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: user.isBlocked ? 'block' : 'unblock', targetId: user._id,
      targetType: 'user', details: `${user.isBlocked ? 'Blocked' : 'Unblocked'} user: ${user.email}`, ip: req.ip,
    });

    res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, data: user });
  } catch (error) { next(error); }
};

const getTasksWithStats = async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });

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
      ...task.toObject(),
      stats: statsMap[task._id.toString()] || { pending: 0, approved: 0, rejected: 0 },
      totalSubmissions: statsMap[task._id.toString()]?.total || 0,
    }));

    res.json({ success: true, data: tasksWithStats });
  } catch (error) { next(error); }
};


const adjustPoints = async (req, res, next) => {
  try {
    const { points, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.points += Number(points);
    await user.save();

    await AdminLog.create({
      adminId: req.user._id, action: 'adjust_points', targetId: user._id,
      targetType: 'user', details: `Adjusted points by ${points}. Reason: ${reason}`, ip: req.ip,
    });

    res.json({ success: true, message: `Points adjusted by ${points}`, data: user });
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

const approveAssignedTask = async (req, res, next) => {
  try {
    const task = await AssignedTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== 'under_review') return res.status(400).json({ success: false, message: 'Task not in review state' });

    const submission = task.submissions[task.submissions.length - 1];
    if (!submission) return res.status(400).json({ success: false, message: 'No submission found' });

    task.status = 'completed';
    await task.save();

    await awardPoints(submission.userId, task.rewardPoints, req.user._id, task._id);

    await AdminLog.create({
      adminId: req.user._id, action: 'approve_assigned', targetId: task._id,
      targetType: 'assigned_task', details: `Approved mission: ${task.title} for user ${submission.userId}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Mission approved and points awarded' });
  } catch (error) { next(error); }
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
      targetType: 'assigned_task', details: `Rejected mission: ${task.title}. Reason: ${rejectionReason}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Mission rejected' });
  } catch (error) { next(error); }
};

module.exports = { 
  getDashboard, getUsers, getSubmissions, approveSubmission, rejectSubmission, 
  toggleBlockUser, getTasksWithStats, adjustPoints, blockUserTemporary,
  getPendingAssignedTasks, approveAssignedTask, rejectAssignedTask
};
