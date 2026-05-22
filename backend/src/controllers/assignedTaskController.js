const AssignedTask = require('../models/AssignedTask');
const User = require('../models/User');
const { uploadToCloudinary } = require('../services/uploadService');
const { checkDailyLimit } = require('../services/taskService');

// Admin: Create and Assign Task
const createAndAssignTask = async (req, res, next) => {
  try {
    const { title, description, rewardPoints, assignedUsers, requiredSkills, submissionConfig } = req.body;
    
    // Strict Validation
    if (!title || !description || !rewardPoints) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing mission parameters: title, description, and credits are mandatory.' 
      });
    }

    // Parse configuration
    let config = submissionConfig || { inputType: 'file' };
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch (e) { config = { inputType: 'file' }; }
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

    // Handle attachments (Briefing Files)
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, 'earnetix/tasks', file.originalname);
          attachments.push({ name: file.originalname, url: result.url });
        } catch (uploadError) {
          console.error('Cloudinary Upload Error:', uploadError);
        }
      }
    }

    // Create individual tasks
    const tasks = await Promise.all(finalAssignedUsers.map(userId => 
      AssignedTask.create({
        title: title.trim(),
        description: description.trim(),
        priority: req.body.priority || 'medium',
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
        rewardPoints: Number(rewardPoints),
        assignedUsers: [userId],
        requiredSkills: skills,
        submissionConfig: config,
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
  } catch (error) { next(error); }
};

// User: Get my assigned tasks
const getMyAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await AssignedTask.find({
      assignedUsers: req.user._id
    }).sort({ deadline: 1 });
    res.json({ success: true, data: tasks });
  } catch (error) { next(error); }
};

// User: Update status (Accept/Reject)
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await AssignedTask.findOne({ _id: req.params.id, assignedUsers: req.user._id });

    if (!task) return res.status(404).json({ success: false, message: 'Mission not found' });
    
    // Only allow specific transitions
    const allowed = ['accepted', 'rejected', 'in_progress'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status transition' });

    task.status = status;
    await task.save();

    res.json({ success: true, message: `Mission ${status}`, data: task });
  } catch (error) { next(error); }
};

// User: Submit Task for Review
const submitAssignedTask = async (req, res, next) => {
  try {
    const { submissionContent, customData } = req.body;
    const task = await AssignedTask.findOne({
      _id: req.params.id,
      assignedUsers: req.user._id
    });

    if (!task) return res.status(404).json({ success: false, message: 'Mission not found' });
    if (task.status === 'completed' || task.status === 'under_review') {
       return res.status(400).json({ success: false, message: 'Work already submitted for this mission' });
    }

    // Daily Limit Check
    const limitReached = await checkDailyLimit(req.user._id);
    if (limitReached) {
      return res.status(400).json({ success: false, message: 'Daily limit of 8 tasks reached.' });
    }

    const it = task.submissionConfig?.inputType || 'file';
    
    // Handle submission attachments
    const submissionAttachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/submissions', file.originalname);
        submissionAttachments.push(result.url);
      }
    }

    // Validation based on inputType
    const hasText = !!submissionContent?.trim();
    const hasFiles = submissionAttachments.length > 0;

    if (it === 'text' && !hasText) return res.status(400).json({ success: false, message: 'Detailed report is required' });
    if ((it === 'file' || it === 'image' || it === 'multiple_files') && !hasFiles) {
        return res.status(400).json({ success: false, message: 'Evidence files are required' });
    }
    if ((it === 'text_file' || it === 'text_image') && (!hasText || !hasFiles)) {
        return res.status(400).json({ success: false, message: 'Both report and evidence files are required' });
    }

    // Safely parse customData — never throw on bad JSON
    let parsedCustomData = null;
    if (customData) {
      try {
        parsedCustomData = typeof customData === 'string' ? JSON.parse(customData) : customData;
      } catch {
        parsedCustomData = null; // ignore malformed custom data
      }
    }

    task.status = 'under_review';
    task.submissions.push({
      userId: req.user._id,
      content: submissionContent,
      attachments: submissionAttachments,
      customData: parsedCustomData,
      submittedAt: new Date()
    });

    await task.save();
    res.json({ success: true, message: 'Evidence submitted for administrative review', data: task });
  } catch (error) { next(error); }
};

module.exports = {
  createAndAssignTask,
  getAllAssignedTasks,
  getMyAssignedTasks,
  submitAssignedTask,
  updateTaskStatus
};
