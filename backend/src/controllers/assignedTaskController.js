const AssignedTask = require('../models/AssignedTask');
const User = require('../models/User');
const { uploadToCloudinary } = require('../services/uploadService');
const { checkDailyLimit } = require('../services/taskService');

// Admin: Create and Assign Task
const createAndAssignTask = async (req, res, next) => {
  try {
    const { title, description, priority, deadline, rewardPoints, assignedUsers, requiredSkills } = req.body;
    
    // Parse assignedUsers if stringified array
    let finalAssignedUsers = assignedUsers || [];
    if (typeof finalAssignedUsers === 'string') {
      try { finalAssignedUsers = JSON.parse(finalAssignedUsers); } catch(e) { finalAssignedUsers = finalAssignedUsers.split(','); }
    }

    // Parse requiredSkills if stringified
    let skills = requiredSkills || [];
    if (typeof skills === 'string') {
      try { skills = JSON.parse(skills); } catch(e) { skills = skills.split(','); }
    }

    // If requiredSkills is provided and no specific users are assigned, find users by skill
    if (skills.length > 0 && finalAssignedUsers.length === 0) {
      const users = await User.find({
        skills: { $in: skills },
        role: 'user'
      }).select('_id');
      finalAssignedUsers = users.map(u => u._id);
    }

    // Handle attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/tasks');
        attachments.push({ name: file.originalname, url: result.url });
      }
    }

    // Create individual tasks for each user for independent status tracking
    const tasks = await Promise.all(finalAssignedUsers.map(userId => 
      AssignedTask.create({
        title,
        description,
        priority,
        deadline,
        rewardPoints,
        assignedUsers: [userId], // Each task is for one user
        requiredSkills: skills,
        attachments,
        createdBy: req.user._id
      })
    ));

    res.status(201).json({ success: true, message: `${tasks.length} individual missions deployed`, data: tasks });
  } catch (error) { next(error); }
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

// User: Submit Task for Review
const submitAssignedTask = async (req, res, next) => {
  try {
    const { submissionContent } = req.body;
    const task = await AssignedTask.findOne({
      _id: req.params.id,
      assignedUsers: req.user._id
    });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });
    if (task.status === 'completed' || task.status === 'under_review') {
       return res.status(400).json({ success: false, message: 'Task already submitted' });
    }

    // Daily Limit Check
    const limitReached = await checkDailyLimit(req.user._id);
    if (limitReached) {
      return res.status(400).json({ success: false, message: 'Daily limit of 8 tasks reached.' });
    }

    // Handle submission attachments
    const submissionAttachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/submissions');
        submissionAttachments.push(result.url);
      }
    }

    task.status = 'under_review';
    task.submissions.push({
      userId: req.user._id,
      content: submissionContent,
      attachments: submissionAttachments,
      submittedAt: new Date()
    });

    await task.save();
    res.json({ success: true, message: 'Work submitted for review', data: task });
  } catch (error) { next(error); }
};

module.exports = {
  createAndAssignTask,
  getAllAssignedTasks,
  getMyAssignedTasks,
  updateTaskStatus
};
