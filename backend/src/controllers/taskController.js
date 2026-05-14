const Task = require('../models/Task');
const AdminLog = require('../models/AdminLog');
const cache = require('../services/cacheService');
const { uploadToCloudinary } = require('../services/uploadService');

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
      .select('-createdBy');

    const total = await Task.countDocuments({ isActive: true });
    
    const responseData = {
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    // Cache for 2 minutes
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
  try {
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/tasks');
        attachments.push({ name: file.originalname, url: result.url });
      }
    }

    // Handle stringified arrays if from form-data
    let allowedExtensions = req.body.allowedExtensions;
    if (typeof allowedExtensions === 'string') {
      try { allowedExtensions = JSON.parse(allowedExtensions); } catch(e) { allowedExtensions = allowedExtensions.split(','); }
    }

    const task = await Task.create({ 
      ...req.body, 
      allowedExtensions: allowedExtensions || ['jpg', 'jpeg', 'png', 'webp'],
      attachments, 
      createdBy: req.user._id 
    });
    
    cache.flush(); // Clear all task caches

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id, action: 'create_task', targetId: task._id,
      targetType: 'task', details: `Created task: ${task.title} with ${attachments.length} attachments`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (error) { next(error); }
};

// ─── UPDATE TASK (Admin) ──────────────────────────────
const updateTask = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // Handle new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/tasks');
        newAttachments.push({ name: file.originalname, url: result.url });
      }
      
      // If we want to append or replace? Let's append by default if field exists
      const existingTask = await Task.findById(req.params.id);
      if (existingTask) {
        updateData.attachments = [...(existingTask.attachments || []), ...newAttachments];
      }
    }

    // Handle stringified arrays
    if (typeof updateData.allowedExtensions === 'string') {
      try { updateData.allowedExtensions = JSON.parse(updateData.allowedExtensions); } catch(e) { updateData.allowedExtensions = updateData.allowedExtensions.split(','); }
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    cache.flush(); // Clear all task caches

    await AdminLog.create({
      adminId: req.user._id, action: 'edit_task', targetId: task._id,
      targetType: 'task', details: `Updated task: ${task.title}`, ip: req.ip,
    });

    res.json({ success: true, message: 'Task updated', data: task });
  } catch (error) { next(error); }
};


// ─── DELETE TASK (Admin) ──────────────────────────────
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    cache.flush(); // Clear all task caches

    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task',
      targetId: task._id,
      targetType: 'task',
      details: `Deleted task: ${task.title}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
