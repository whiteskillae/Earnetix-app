const AssignedTask = require('../models/AssignedTask');
const User = require('../models/User');
const { uploadToCloudinary } = require('../services/uploadService');
const { checkDailyLimit } = require('../services/taskService');

// Admin: Create and Assign Task
const createAndAssignTask = async (req, res, next) => {
  try {
    console.log('Incoming Deployment Request:', { 
      body: req.body, 
      filesCount: req.files?.length || 0 
    });

    const { title, description, rewardPoints, assignedUsers, requiredSkills } = req.body;
    
    // Strict Validation
    if (!title || !description || !rewardPoints) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing mission parameters: title, description, and credits are mandatory.' 
      });
    }

    // Parse assignedUsers
    let finalAssignedUsers = [];
    if (assignedUsers) {
      try {
        finalAssignedUsers = typeof assignedUsers === 'string' ? JSON.parse(assignedUsers) : assignedUsers;
      } catch (e) {
        finalAssignedUsers = typeof assignedUsers === 'string' ? assignedUsers.split(',') : [];
      }
    }

    // Parse requiredSkills
    let skills = [];
    if (requiredSkills) {
      try {
        skills = typeof requiredSkills === 'string' ? JSON.parse(requiredSkills) : requiredSkills;
      } catch (e) {
        skills = typeof requiredSkills === 'string' ? requiredSkills.split(',') : [];
      }
    }

    if (skills.length > 0 && finalAssignedUsers.length === 0) {
      const usersBySkill = await User.find({
        skills: { $in: skills },
        role: 'user'
      }).select('_id');
      finalAssignedUsers = usersBySkill.map(u => u._id);
    }

    if (finalAssignedUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'Strategic Failure: No agents targeted for this mission.' });
    }

    // Handle attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, 'earnetix/tasks');
          attachments.push({ name: file.originalname, url: result.url });
        } catch (uploadError) {
          console.error('Cloudinary Upload Error:', uploadError);
          // Continue with other files or fail if critical? Let's continue.
        }
      }
    }

    // Create individual tasks
    const tasks = await Promise.all(finalAssignedUsers.map(userId => 
      AssignedTask.create({
        title: title.trim(),
        description: description.trim(),
        priority: req.body.priority || 'medium',
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined, // Model will use its own default if undefined
        rewardPoints: Number(rewardPoints),
        assignedUsers: [userId],
        requiredSkills: skills,
        attachments,
        createdBy: req.user._id
      })
    ));

    console.log(`Success: Deployed ${tasks.length} missions.`);
    res.status(201).json({ success: true, message: `${tasks.length} individual missions deployed`, data: tasks });
  } catch (error) { 
    console.error('Backend Deployment Exception:', error);
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
  submitAssignedTask
};
