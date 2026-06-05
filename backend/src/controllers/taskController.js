const Task = require('../models/Task');
const AdminLog = require('../models/AdminLog');
const cache = require('../services/cacheService');
const { uploadMultipleToCloudinary } = require('../services/uploadService');
const { cleanupTempFiles } = require('../middleware/uploadMiddleware');
const logger = require('../utils/logger');

// ─── GET ALL ACTIVE TASKS (User) ───────────────────────
const getTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const cacheKey = `tasks_p${page}_l${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({ success: true, data: cachedData, fromCache: true });
    }

    const tasks = await Task.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-createdBy')
      .lean();

    const total = await Task.countDocuments({ isActive: true });
    
    const responseData = {
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    // Cache for 2 minutes, registered under 'tasks' group
    cache.set(cacheKey, responseData, 120);

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

// ─── GET TASK BY ID ────────────────────────────────────
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE TASK (Admin) ──────────────────────────────
const createTask = async (req, res, next) => {
  const filesToCleanup = req.files;

  try {
    // Handle file uploads — PARALLEL instead of sequential
    const attachments = [];
    if (req.files && req.files.length > 0) {
      const results = await uploadMultipleToCloudinary(req.files, 'earnetix/tasks', 3);
      for (const r of results) {
        if (r.success) {
          attachments.push({ name: r.file.originalname, url: r.result.url });
        } else {
          logger.error(`Task attachment upload failed: ${r.error}`);
        }
      }
    }

    // Handle stringified arrays if from form-data
    let allowedExtensions = req.body.allowedExtensions;
    if (typeof allowedExtensions === 'string') {
      try { allowedExtensions = JSON.parse(allowedExtensions); } catch(e) { allowedExtensions = allowedExtensions.split(','); }
    }

    // Map flat fields to submissionConfig structure
    const submissionConfig = {
      inputType: req.body.inputType || 'file',
      allowedExtensions: allowedExtensions || ['jpg', 'jpeg', 'png', 'webp', 'mp3', 'mp4', 'docx', 'pdf', 'txt', 'zip'],
      maxFileSize: req.body.maxFileSize || 5 * 1024 * 1024
    };

    const task = await Task.create({ 
      ...req.body, 
      submissionConfig,
      attachments, 
      createdBy: req.user._id 
    });
    
    // Targeted cache invalidation — only tasks, not everything
    cache.invalidateByPrefix('tasks_');

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id, action: 'create_task', targetId: task._id,
      targetType: 'task', details: `Created task: ${task.title} with ${attachments.length} attachments`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (error) { next(error); }
  finally {
    cleanupTempFiles(filesToCleanup);
  }
};

// ─── UPDATE TASK (Admin) ──────────────────────────────
const updateTask = async (req, res, next) => {
  const filesToCleanup = req.files;

  try {
    const updateData = { ...req.body };
    
    // Handle new attachments — PARALLEL
    if (req.files && req.files.length > 0) {
      const results = await uploadMultipleToCloudinary(req.files, 'earnetix/tasks', 3);
      const newAttachments = [];
      for (const r of results) {
        if (r.success) {
          newAttachments.push({ name: r.file.originalname, url: r.result.url });
        }
      }
      
      // Append new attachments to existing ones
      const existingTask = await Task.findById(req.params.id);
      if (existingTask) {
        updateData.attachments = [...(existingTask.attachments || []), ...newAttachments];
      }
    }

    // Handle stringified arrays
    if (typeof updateData.allowedExtensions === 'string') {
      try { updateData.allowedExtensions = JSON.parse(updateData.allowedExtensions); } catch(e) { updateData.allowedExtensions = updateData.allowedExtensions.split(','); }
    }

    if (updateData.inputType || updateData.allowedExtensions || updateData.maxFileSize) {
      updateData.submissionConfig = {
        inputType: updateData.inputType || 'file',
        allowedExtensions: updateData.allowedExtensions || ['jpg', 'jpeg', 'png', 'webp', 'mp3', 'mp4', 'docx', 'pdf', 'txt', 'zip'],
        maxFileSize: updateData.maxFileSize || 5 * 1024 * 1024
      };
      delete updateData.inputType;
      delete updateData.allowedExtensions;
      delete updateData.maxFileSize;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Targeted cache invalidation
    cache.invalidateByPrefix('tasks_');

    await AdminLog.create({
      adminId: req.user._id, action: 'edit_task', targetId: task._id,
      targetType: 'task', details: `Updated task: ${task.title}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Task updated', data: task });
  } catch (error) { next(error); }
  finally {
    cleanupTempFiles(filesToCleanup);
  }
};


// ─── DELETE TASK (Admin — Soft Delete) ────────────────
// Soft-deletes the task (isActive=false) so accepted evidence remains archived.
// Submissions referencing this task will still display correctly.
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.isActive = false;
    await task.save();

    // Targeted cache invalidation
    cache.invalidateByPrefix('tasks_');

    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task',
      targetId: task._id,
      targetType: 'task',
      details: `Archived task: ${task.title}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Task archived successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Decommission Tasks (Soft Delete)
 */
const deleteTasksBulk = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'IDs required' });

    const results = { success: 0, failed: 0 };
    for (const id of ids) {
      try {
        const task = await Task.findById(id);
        if (!task || !task.isActive) { results.failed++; continue; }
        
        task.isActive = false;
        await task.save();
        results.success++;
      } catch (err) { results.failed++; }
    }

    // Targeted cache invalidation
    cache.invalidateByPrefix('tasks_');
    
    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task',
      targetId: req.user._id, // generic
      targetType: 'task',
      details: `Admin performed bulk archive of ${results.success} tasks`,
      ip: req.ip,
    });

    res.json({ success: true, message: `Bulk archive complete. Success: ${results.success}, Failed: ${results.failed}` });
  } catch (error) { next(error); }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, deleteTasksBulk };
