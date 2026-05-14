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
      $or: [
        { imageUrl: { $ne: null } },
        { fileUrl: { $ne: null } },
      ]
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
      const files = [];
      if (item.imageUrl) {
        const ext = item.imageUrl.split('.').pop().split('?')[0].toLowerCase();
        files.push({ type: 'image', url: item.imageUrl, publicId: item.imagePublicId, ext });
      }
      if (item.fileUrl) {
        const ext = item.fileUrl.split('.').pop().split('?')[0].toLowerCase();
        const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(ext);
        files.push({ type: isVideo ? 'video' : 'document', url: item.fileUrl, publicId: item.filePublicId, ext });
      }
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
    const { submissionId, fileField } = req.params; // fileField: 'image' or 'file'

    if (!['image', 'file'].includes(fileField)) {
      return res.status(400).json({ success: false, message: 'Invalid file field. Use "image" or "file".' });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const publicIdField = fileField === 'image' ? 'imagePublicId' : 'filePublicId';
    const urlField = fileField === 'image' ? 'imageUrl' : 'fileUrl';
    const publicId = submission[publicIdField];

    if (!publicId) {
      return res.status(400).json({ success: false, message: `No ${fileField} file to delete` });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(publicId);

    // Clear DB references
    submission[publicIdField] = null;
    submission[urlField] = null;
    await submission.save();

    // Log the action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'delete_task', // reuse existing action type
      targetId: submission._id,
      targetType: 'submission',
      details: `Admin deleted ${fileField} file (${publicId}) from submission`,
      ip: req.ip,
    });

    logger.info(`Gallery: Admin ${req.user._id} deleted ${fileField} from submission ${submissionId}`);

    res.json({ success: true, message: `${fileField} file deleted successfully` });
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
        const { submissionId, fileField } = item;
        const submission = await Submission.findById(submissionId);
        if (!submission) { results.failed++; continue; }

        const publicIdField = fileField === 'image' ? 'imagePublicId' : 'filePublicId';
        const urlField = fileField === 'image' ? 'imageUrl' : 'fileUrl';
        const publicId = submission[publicIdField];

        if (publicId) {
          await deleteFromCloudinary(publicId);
          submission[publicIdField] = null;
          submission[urlField] = null;
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

