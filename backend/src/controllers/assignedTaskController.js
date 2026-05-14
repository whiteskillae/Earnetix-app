const AssignedTask = require('../models/AssignedTask');
const User = require('../models/User');

// Admin: Create and Assign Task
const createAndAssignTask = async (req, res, next) => {
  try {
    const { title, description, priority, deadline, rewardPoints, assignedUsers, requiredSkills } = req.body;
    
    let finalAssignedUsers = assignedUsers || [];

    // If requiredSkills is provided and no specific users are assigned, find users by skill
    if (requiredSkills && requiredSkills.length > 0 && finalAssignedUsers.length === 0) {
      const users = await User.find({
        skills: { $in: requiredSkills },
        role: 'user'
      }).select('_id');
      finalAssignedUsers = users.map(u => u._id);
    }

    const task = await AssignedTask.create({
      title,
      description,
      priority,
      deadline,
      rewardPoints,
      assignedUsers: finalAssignedUsers,
      requiredSkills,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all assigned tasks
const getAllAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await AssignedTask.find().populate('assignedUsers', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// User: Get my assigned tasks
const getMyAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await AssignedTask.find({
      assignedUsers: req.user._id
    }).sort({ deadline: 1 });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// User: Update Task Status
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, submissionContent } = req.body;
    const task = await AssignedTask.findOne({
      _id: req.params.id,
      assignedUsers: req.user._id
    });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });

    task.status = status;
    
    if (status === 'completed' && submissionContent) {
      task.submissions.push({
        userId: req.user._id,
        content: submissionContent
      });
    }

    await task.save();
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAndAssignTask,
  getAllAssignedTasks,
  getMyAssignedTasks,
  updateTaskStatus
};
