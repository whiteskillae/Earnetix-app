const Blog = require('../models/Blog');
const Task = require('../models/Task');
const AssignedTask = require('../models/AssignedTask');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');

// ─── Helper: strip HTML tags for excerpt/word count ──────────────
const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const countWords = (html) => {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).length : 0;
};
const makeExcerpt = (html, maxLen = 200) => {
  const text = stripHtml(html);
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
};

// ─── USER: Create / Publish Blog ──────────────────────────────────
const createBlog = async (req, res, next) => {
  try {
    const { title, content, pages, taskId, taskType, wordCount } = req.body;

    if (!title || !content || !taskId || !taskType) {
      return res.status(400).json({ success: false, message: 'Title, content, taskId, and taskType are required.' });
    }

    // Verify task exists and is blog type
    let task;
    if (taskType === 'public') {
      task = await Task.findById(taskId);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
      if (task.taskType !== 'blog') return res.status(400).json({ success: false, message: 'This task does not accept blog submissions.' });
    } else {
      task = await AssignedTask.findOne({ _id: taskId, assignedUsers: req.user._id });
      if (!task) return res.status(404).json({ success: false, message: 'Assigned task not found.' });
      if (task.taskType !== 'blog') return res.status(400).json({ success: false, message: 'This mission does not accept blog submissions.' });
    }

    // Check for existing blog for this task (only one allowed)
    const existing = await Blog.findOne({ userId: req.user._id, taskId, status: { $nin: ['blocked'] } });
    if (existing) {
      // If rejected and rejectionCount < 2, allow update via PUT
      if (existing.status === 'rejected' && existing.rejectionCount < 2) {
        return res.status(400).json({ success: false, message: 'You already have a blog for this task. Please edit and resubmit it.', blogId: existing._id });
      }
      if (existing.status === 'approved' || existing.status === 'pending') {
        return res.status(400).json({ success: false, message: 'You already submitted a blog for this task.' });
      }
    }

    // Handle cover image upload
    let coverImage = null;
    let coverImagePublicId = null;
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      const result = await uploadToCloudinary(req.files.coverImage[0].buffer, 'earnetix/blogs/covers', req.files.coverImage[0].originalname);
      coverImage = result.url;
      coverImagePublicId = result.public_id;
    }

    // Parse pages
    let parsedPages = [];
    try {
      parsedPages = typeof pages === 'string' ? JSON.parse(pages) : (Array.isArray(pages) ? pages : []);
    } catch { parsedPages = []; }

    const blog = await Blog.create({
      userId: req.user._id,
      taskId,
      taskType,
      title: title.trim(),
      content,
      pages: parsedPages,
      coverImage,
      coverImagePublicId,
      excerpt: makeExcerpt(content),
      wordCount: parseInt(wordCount) || countWords(content),
      status: 'pending',
      publishedAt: new Date(),
    });

    // Update assigned task status to under_review
    if (taskType === 'assigned') {
      await AssignedTask.findByIdAndUpdate(taskId, { status: 'under_review' });
    }

    res.status(201).json({ success: true, message: 'Blog submitted for review!', data: blog });
  } catch (error) { next(error); }
};

// ─── USER: Edit & Resubmit Blog ───────────────────────────────────
const updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, userId: req.user._id });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });

    if (blog.status === 'blocked') return res.status(403).json({ success: false, message: 'This blog has been permanently blocked.' });
    if (blog.status === 'approved') return res.status(400).json({ success: false, message: 'Approved blogs cannot be edited. Delete and resubmit.' });
    if (blog.status === 'pending') return res.status(400).json({ success: false, message: 'Blog is currently under review. Wait for admin response.' });
    if (blog.rejectionCount >= 2) return res.status(403).json({ success: false, message: 'Maximum resubmissions reached. Blog is permanently blocked.' });

    const { title, content, pages, wordCount } = req.body;
    
    if (title) blog.title = title.trim();
    if (content) {
      blog.content = content;
      blog.excerpt = makeExcerpt(content);
      blog.wordCount = parseInt(wordCount) || countWords(content);
    }
    if (pages) {
      try { blog.pages = typeof pages === 'string' ? JSON.parse(pages) : pages; } catch {}
    }

    // Handle new cover image
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      // Delete old cover
      if (blog.coverImagePublicId) {
        try { await deleteFromCloudinary(blog.coverImagePublicId); } catch {}
      }
      const result = await uploadToCloudinary(req.files.coverImage[0].buffer, 'earnetix/blogs/covers', req.files.coverImage[0].originalname);
      blog.coverImage = result.url;
      blog.coverImagePublicId = result.public_id;
    }

    blog.status = 'pending';
    blog.publishedAt = new Date();
    await blog.save();

    // Reset assigned task to under_review
    if (blog.taskType === 'assigned') {
      await AssignedTask.findByIdAndUpdate(blog.taskId, { status: 'under_review' });
    }

    res.json({ success: true, message: 'Blog resubmitted for review!', data: blog });
  } catch (error) { next(error); }
};

// ─── USER: Delete Blog ────────────────────────────────────────────
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, userId: req.user._id });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    if (blog.status === 'approved') return res.status(400).json({ success: false, message: 'Approved blogs cannot be deleted. Contact admin.' });

    // Cleanup Cloudinary
    if (blog.coverImagePublicId) {
      try { await deleteFromCloudinary(blog.coverImagePublicId); } catch {}
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Blog deleted.' });
  } catch (error) { next(error); }
};

// ─── PUBLIC: Get All Approved Blogs ──────────────────────────────
const getPublicBlogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ status: 'approved' })
      .populate('userId', 'name username uid avatar')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title excerpt coverImage userId publishedAt wordCount createdAt');

    const total = await Blog.countDocuments({ status: 'approved' });

    res.json({ success: true, data: { blogs, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// ─── PUBLIC: Get Single Blog ──────────────────────────────────────
const getBlogById = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('userId', 'name username uid avatar bio');
    
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    if (blog.status !== 'approved' && (!req.user || (req.user._id.toString() !== blog.userId._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({ success: false, message: 'Blog not available.' });
    }

    res.json({ success: true, data: blog });
  } catch (error) { next(error); }
};

// ─── USER: Get My Blogs ───────────────────────────────────────────
const getMyBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (error) { next(error); }
};

// ─── ADMIN: Get All Blogs ─────────────────────────────────────────
const adminGetAllBlogs = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const blogs = await Blog.find(filter)
      .populate('userId', 'name username uid email avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (error) { next(error); }
};

// ─── ADMIN: Approve Blog ──────────────────────────────────────────
const adminApproveBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('userId');
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    if (blog.status === 'approved') return res.status(400).json({ success: false, message: 'Blog already approved.' });

    // Get reward points from task
    let rewardPoints = 0;
    try {
      if (blog.taskType === 'public') {
        const task = await Task.findById(blog.taskId);
        rewardPoints = task?.rewardPoints || 0;
      } else {
        const task = await AssignedTask.findById(blog.taskId);
        rewardPoints = task?.rewardPoints || 0;
        // Mark assigned task as completed
        if (task) {
          task.status = 'completed';
          await task.save();
        }
      }
    } catch {}

    blog.status = 'approved';
    blog.reviewedBy = req.user._id;
    blog.reviewedAt = new Date();
    blog.publishedAt = blog.publishedAt || new Date();
    await blog.save();

    // Award points to user
    if (rewardPoints > 0) {
      await User.findByIdAndUpdate(blog.userId._id, { $inc: { points: rewardPoints } });
    }

    // Send approval announcement to user
    await Announcement.create({
      title: '🎉 Blog Approved!',
      content: `Your blog "${blog.title}" has been approved and published! +${rewardPoints} points have been added to your account.`,
      priority: 'high',
      targetUsers: [blog.userId._id],
      createdBy: req.user._id,
    });

    res.json({ success: true, message: `Blog approved! ${rewardPoints} points awarded.`, data: blog });
  } catch (error) { next(error); }
};

// ─── ADMIN: Reject Blog ───────────────────────────────────────────
const adminRejectBlog = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required.' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    if (blog.status === 'blocked') return res.status(400).json({ success: false, message: 'Blog is already blocked.' });

    blog.rejectionCount = (blog.rejectionCount || 0) + 1;
    blog.rejectionReason = reason;
    blog.reviewedBy = req.user._id;
    blog.reviewedAt = new Date();

    if (blog.rejectionCount >= 2) {
      // Permanently block
      blog.status = 'blocked';
      // Block the assigned task too
      if (blog.taskType === 'assigned') {
        await AssignedTask.findByIdAndUpdate(blog.taskId, { status: 'rejected', rejectionReason: reason });
      }
      await blog.save();

      // Announce block
      await Announcement.create({
        title: '❌ Blog Permanently Blocked',
        content: `Your blog "${blog.title}" has been rejected for the 2nd time and is now permanently blocked. Reason: ${reason}. This task has been closed.`,
        priority: 'high',
        targetUsers: [blog.userId],
        createdBy: req.user._id,
      });

      return res.json({ success: true, message: 'Blog blocked after 2nd rejection.', data: blog });
    }

    // First rejection — allow resubmit
    blog.status = 'rejected';
    await blog.save();

    // Send targeted rejection announcement
    await Announcement.create({
      title: '⚠️ Blog Rejected',
      content: `Your blog "${blog.title}" was rejected (Attempt ${blog.rejectionCount}/2). Reason: ${reason}. You can edit and resubmit it. After 2 rejections it will be permanently blocked.`,
      priority: 'high',
      targetUsers: [blog.userId],
      createdBy: req.user._id,
    });

    res.json({ success: true, message: `Blog rejected (${blog.rejectionCount}/2). User notified.`, data: blog });
  } catch (error) { next(error); }
};

// ─── ADMIN: Block Blog ────────────────────────────────────────────
const adminBlockBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { status: 'blocked', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    res.json({ success: true, message: 'Blog blocked.', data: blog });
  } catch (error) { next(error); }
};

// ─── USER: Get Blog Tasks (blog-type tasks available to user) ─────
const getBlogTasks = async (req, res, next) => {
  try {
    // Public blog tasks
    const publicTasks = await Task.find({ taskType: 'blog', isActive: true }).select('_id title description rewardPoints');
    
    // Assigned blog missions
    const assignedTasks = await AssignedTask.find({
      assignedUsers: req.user._id,
      taskType: 'blog',
      status: { $in: ['pending', 'accepted', 'in_progress', 'rejected'] }
    }).select('_id title description rewardPoints status');

    // Filter out tasks that already have approved/pending blogs
    const userBlogs = await Blog.find({ userId: req.user._id, status: { $in: ['approved', 'pending'] } }).select('taskId');
    const usedTaskIds = userBlogs.map(b => b.taskId.toString());

    const availablePublic = publicTasks.filter(t => !usedTaskIds.includes(t._id.toString()));
    const availableAssigned = assignedTasks.filter(t => !usedTaskIds.includes(t._id.toString()));

    res.json({ success: true, data: { publicTasks: availablePublic, assignedTasks: availableAssigned } });
  } catch (error) { next(error); }
};

module.exports = {
  createBlog,
  updateBlog,
  deleteBlog,
  getPublicBlogs,
  getBlogById,
  getMyBlogs,
  adminGetAllBlogs,
  adminApproveBlog,
  adminRejectBlog,
  adminBlockBlog,
  getBlogTasks,
};
