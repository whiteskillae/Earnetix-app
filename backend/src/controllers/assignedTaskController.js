const AssignedTask = require('../models/AssignedTask');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const { uploadToCloudinary, uploadMultipleToCloudinary, rollbackUploads } = require('../services/uploadService');
const { validateFile } = require('../services/uploadService');
const { checkDailyLimit } = require('../services/taskService');
const { cleanupTempFiles } = require('../middleware/uploadMiddleware');
const { isFileSafe, isFileBufferSafe } = require('../services/fileSecurityService');
const logger = require('../utils/logger');

const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'svg', 'tiff'];

// Admin: Create and Assign Task
const createAndAssignTask = async (req, res, next) => {
  const filesToCleanup = req.files;

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

    // Handle attachments (Briefing Files) — PARALLEL uploads
    const attachments = [];
    if (req.files && req.files.length > 0) {
      const results = await uploadMultipleToCloudinary(req.files, 'earnetix/tasks', 3);
      
      for (const r of results) {
        if (r.success) {
          attachments.push({ name: r.file.originalname, url: r.result.url });
        } else {
          // Log but don't fail the entire operation for individual upload errors
          logger.error(`Attachment upload failed for ${r.file?.originalname}: ${r.error}`);
        }
      }
    }

    // Create individual tasks
    const tasks = await Promise.all(finalAssignedUsers.map(userId => 
      AssignedTask.create({
        title: title.trim(),
        description: description.trim(),
        taskType: req.body.taskType || 'general',
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

    // Log admin action
    AdminLog.create({
      adminId: req.user._id,
      action: 'create_task',
      targetId: req.user._id,
      targetType: 'assigned_task',
      details: `Deployed ${tasks.length} missions: "${title}" with ${attachments.length} attachments`,
      ip: req.ip,
    }).catch(err => logger.error(`Failed to log task creation: ${err.message}`));

    res.status(201).json({ success: true, message: `${tasks.length} individual missions deployed`, data: tasks });
  } catch (error) { next(error); }
  finally {
    cleanupTempFiles(filesToCleanup);
  }
};

// Admin: Get all assigned tasks
const getAllAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await AssignedTask.find({ status: { $ne: 'archived' } })
      .populate('assignedUsers', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (error) { next(error); }
};

// User: Get my assigned tasks
const getMyAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await AssignedTask.find({
      assignedUsers: req.user._id,
      status: { $ne: 'archived' }
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
  const filesToCleanup = req.files;

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
    const maxFileSize = task.submissionConfig?.maxFileSize || 5 * 1024 * 1024;
    const allowedExtensions = task.submissionConfig?.allowedExtensions || ['*'];

    if (req.files && req.files.length > 5) {
      return res.status(400).json({ success: false, message: 'A maximum of 5 files can be uploaded per mission submission' });
    }

    if (req.files) {
      for (const file of req.files) {
        const ext = file.originalname.split('.').pop().toLowerCase();
        const allowedForFile = allowedImageExtensions.includes(ext) ? allowedImageExtensions : allowedExtensions;
        validateFile(file, allowedForFile, maxFileSize);

        if (file.path) {
          const safety = await isFileSafe(file.path, file.originalname, maxFileSize);
          if (!safety.safe) {
            return res.status(400).json({ success: false, message: safety.reason });
          }
        } else if (file.buffer) {
          const safety = await isFileBufferSafe(file.buffer, file.originalname, maxFileSize);
          if (!safety.safe) {
            return res.status(400).json({ success: false, message: safety.reason });
          }
        }
      }
    }
     
    // Handle submission attachments — parallel upload
    const submissionAttachments = [];
    if (req.files && req.files.length > 0) {
      const results = await uploadMultipleToCloudinary(req.files, 'earnetix/submissions', 3);
      for (const r of results) {
        if (r.success) {
          submissionAttachments.push(r.result.url);
        }
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
    if (it === 'image_file' && !hasFiles) {
        return res.status(400).json({ success: false, message: 'Both screenshot and file evidence are required' });
    }
    if (it === 'all') {
        const hasLink = typeof submissionContent === 'string' && submissionContent.includes('Link: ');
        if (!hasText || !hasFiles || !hasLink) {
          return res.status(400).json({ success: false, message: 'Full evidence required: Text + Image/File + Link' });
        }
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
  finally {
    cleanupTempFiles(filesToCleanup);
  }
};

// Admin: Delete Assigned Task — SOFT DELETE (preserves evidence)
const deleteAssignedTask = async (req, res, next) => {
  try {
    const task = await AssignedTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Mission not found' });

    // Soft delete — preserves submission history and evidence
    task.status = 'archived';
    await task.save();

    AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task',
      targetId: task._id,
      targetType: 'assigned_task',
      details: `Archived assigned task: ${task.title}`,
      ip: req.ip,
    }).catch(err => logger.error(`Failed to log task deletion: ${err.message}`));

    res.json({ success: true, message: 'Mission archived successfully' });
  } catch (error) { next(error); }
};

// Admin: Update Assigned Task
const updateAssignedTaskAdmin = async (req, res, next) => {
  try {
    const { title, description, rewardPoints, deadline } = req.body;
    const task = await AssignedTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Mission not found' });
    
    if (title) task.title = title;
    if (description) task.description = description;
    if (rewardPoints) task.rewardPoints = rewardPoints;
    if (deadline) task.deadline = new Date(deadline);
    
    await task.save();
    res.json({ success: true, message: 'Mission updated successfully', data: task });
  } catch (error) { next(error); }
};

module.exports = {
  createAndAssignTask,
  getAllAssignedTasks,
  getMyAssignedTasks,
  submitAssignedTask,
  updateTaskStatus,
  deleteAssignedTask,
  updateAssignedTaskAdmin
};
