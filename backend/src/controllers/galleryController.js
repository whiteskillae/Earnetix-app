const Submission = require('../models/Submission');
const AssignedTask = require('../models/AssignedTask');
const { deleteFromCloudinary } = require('../services/uploadService');
const AdminLog = require('../models/AdminLog');
const logger = require('../utils/logger');

/**
 * Admin Gallery: Get all uploaded evidence files across the platform.
 * Supports pagination, filtering by type/status/uploader/mission.
 */
const getGalleryItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const { status, fileType, userId, taskId, dateFrom, dateTo } = req.query;

    // Build filter — only items that have at least one file
    const filter = {
      'attachments.0': { $exists: true }
    };

    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (taskId) filter.taskId = taskId;

    // Date range
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      Submission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('taskId', 'title')
        .lean(),
      Submission.countDocuments(filter),
    ]);

    // Enrich items with file type info
    const enriched = items.map(item => {
      const files = item.attachments ? item.attachments.map(a => {
        const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(a.resourceType);
        return {
           type: a.resourceType === 'image' ? 'image' : (a.resourceType === 'video' ? 'video' : 'document'),
           url: a.url,
           publicId: a.publicId,
           ext: a.originalName ? a.originalName.split('.').pop().toLowerCase() : ''
        };
      }) : [];
      return {
        _id: item._id,
        uploader: item.userId,
        task: item.taskId,
        status: item.status,
        files,
        textContent: item.textContent,
        linkUrl: item.linkUrl,
        createdAt: item.createdAt,
      };
    });

    // Apply client-side fileType filter if specified
    let result = enriched;
    if (fileType) {
      result = enriched.filter(item => item.files.some(f => f.type === fileType));
    }

    res.json({
      success: true,
      data: {
        items: result,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) { next(error); }
};

/**
 * Admin Gallery: Delete a specific file from a submission.
 * Removes from Cloudinary and clears the reference in DB.
 * Does NOT delete the entire submission record.
 */
const deleteGalleryItem = async (req, res, next) => {
  try {
    const { submissionId, fileField: encodedPublicId } = req.params; // we reused fileField route param for encoded publicId
    const publicId = decodeURIComponent(encodedPublicId);

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const attachmentIndex = submission.attachments ? submission.attachments.findIndex(a => a.publicId === publicId) : -1;

    if (attachmentIndex === -1) {
      return res.status(400).json({ success: false, message: `Attachment not found` });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(publicId, submission.attachments[attachmentIndex].resourceType);

    // Clear DB reference
    submission.attachments.splice(attachmentIndex, 1);
    await submission.save();

    // Log the action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task', // reuse existing action type
      targetId: submission._id,
      targetType: 'submission',
      details: `Admin deleted file (${publicId}) from submission`,
      ip: req.ip,
    });

    logger.info(`Gallery: Admin ${req.user._id} deleted ${publicId} from submission ${submissionId}`);

    res.json({ success: true, message: `Asset deleted successfully` });
  } catch (error) { next(error); }
};

/**
 * Admin Gallery: Bulk Delete specific files from multiple submissions.
 */
const deleteGalleryItemsBulk = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { submissionId, fileField }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of items to delete is required' });
    }

    const results = { success: 0, failed: 0 };

    for (const item of items) {
      try {
        const { submissionId, publicId } = item;
        const submission = await Submission.findById(submissionId);
        if (!submission) { results.failed++; continue; }

        const attachmentIndex = submission.attachments ? submission.attachments.findIndex(a => a.publicId === publicId) : -1;

        if (attachmentIndex !== -1) {
          await deleteFromCloudinary(publicId, submission.attachments[attachmentIndex].resourceType);
          submission.attachments.splice(attachmentIndex, 1);
          await submission.save();
          results.success++;
        } else {
          results.failed++;
        }
      } catch (err) {
        results.failed++;
      }
    }

    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task',
      targetId: req.user._id, // generic target for bulk
      targetType: 'submission',
      details: `Admin performed bulk delete of ${results.success} gallery items`,
      ip: req.ip,
    });

    res.json({ success: true, message: `Bulk delete complete. Success: ${results.success}, Failed: ${results.failed}`, results });
  } catch (error) { next(error); }
};

module.exports = { getGalleryItems, deleteGalleryItem, deleteGalleryItemsBulk };

