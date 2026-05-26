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

    // Handle inline images
    let finalContent = content;
    let finalPages = parsedPages;
    if (req.files && req.files.inlineImages) {
      for (const file of req.files.inlineImages) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/blogs/inline', file.originalname);
        const localUrlRegex = new RegExp(`local:${file.originalname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        finalContent = finalContent.replace(localUrlRegex, result.url);
        finalPages = finalPages.map(p => p.replace(localUrlRegex, result.url));
      }
    }

    const blog = await Blog.create({
      userId: req.user._id,
      taskId,
      taskType,
      title: title.trim(),
      content: finalContent,
      pages: finalPages,
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
    if (blog.status === 'approved') return res.status(403).json({ success: false, message: 'Approved blogs cannot be edited.' });
    if (blog.status === 'rejected' && blog.rejectionCount >= 2) {
      return res.status(403).json({ success: false, message: 'Maximum resubmissions reached. Blog is permanently blocked.' });
    }

    const { title, content, pages, wordCount } = req.body;
    let parsedPages = blog.pages;
    if (pages) {
      try { parsedPages = typeof pages === 'string' ? JSON.parse(pages) : pages; } catch {}
    }

    let finalContent = content || blog.content;
    if (req.files && req.files.inlineImages) {
      for (const file of req.files.inlineImages) {
        const result = await uploadToCloudinary(file.buffer, 'earnetix/blogs/inline', file.originalname);
        const localUrlRegex = new RegExp(`local:${file.originalname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        finalContent = finalContent.replace(localUrlRegex, result.url);
        parsedPages = parsedPages.map(p => p.replace(localUrlRegex, result.url));
      }
    }

    if (title) blog.title = title.trim();
    if (finalContent) {
      blog.content = finalContent;
      blog.excerpt = makeExcerpt(finalContent);
      blog.wordCount = parseInt(wordCount) || countWords(finalContent);
      blog.pages = parsedPages;
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
    if (blog.status === 'blocked') return res.status(403).json({ success: false, message: 'This blog has been permanently blocked and cannot be deleted.' });
    if (blog.status === 'approved') return res.status(403).json({ success: false, message: 'Approved blogs cannot be deleted.' });

    if (blog.taskType === 'assigned') {
      await AssignedTask.findByIdAndUpdate(blog.taskId, { status: 'accepted' });
    }

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
      .select('title excerpt coverImage userId publishedAt wordCount createdAt likesCount likes');

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

// ─── USER: Toggle Like on Blog ────────────────────────────────────
const toggleLikeBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    if (blog.status !== 'approved') return res.status(403).json({ success: false, message: 'Only approved blogs can be liked.' });

    const userId = req.user._id;
    const alreadyLiked = blog.likes.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
      blog.likes = blog.likes.filter(id => id.toString() !== userId.toString());
      blog.likesCount = Math.max(0, (blog.likesCount || 0) - 1);
    } else {
      blog.likes.push(userId);
      blog.likesCount = (blog.likesCount || 0) + 1;
    }

    await blog.save();

    res.json({
      success: true,
      data: { liked: !alreadyLiked, likesCount: blog.likesCount },
      message: alreadyLiked ? 'Blog unliked' : 'Blog liked!',
    });
  } catch (error) { next(error); }
};

// ─── ADMIN: Get All Blogs ─────────────────────────────────────────
const adminGetAllBlogs = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
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
      // Permanently block after 2 rejections
      blog.status = 'blocked';
      if (blog.taskType === 'assigned') {
        await AssignedTask.findByIdAndUpdate(blog.taskId, { status: 'rejected', rejectionReason: reason });
      }

      await Announcement.create({
        title: '❌ Blog Permanently Blocked',
        content: `Your blog "${blog.title}" has been permanently blocked after ${blog.rejectionCount} rejections. Reason: ${reason}`,
        priority: 'high',
        targetUsers: [blog.userId],
        createdBy: req.user._id,
      });
    } else {
      // First rejection — allow resubmission
      blog.status = 'rejected';
      if (blog.taskType === 'assigned') {
        await AssignedTask.findByIdAndUpdate(blog.taskId, { status: 'rejected', rejectionReason: reason });
      }

      await Announcement.create({
        title: '⚠️ Blog Needs Revision',
        content: `Your blog "${blog.title}" needs revision. Reason: ${reason}. You have ${2 - blog.rejectionCount} resubmission(s) remaining.`,
        priority: 'high',
        targetUsers: [blog.userId],
        createdBy: req.user._id,
      });
    }

    await blog.save();

    res.json({
      success: true,
      message: blog.rejectionCount >= 2 ? 'Blog permanently blocked.' : 'Blog rejected. User can resubmit.',
      data: blog,
    });
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
  toggleLikeBlog,
  adminGetAllBlogs,
  adminApproveBlog,
  adminRejectBlog,
  adminBlockBlog,
  getBlogTasks,
};
