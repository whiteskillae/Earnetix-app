const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const AdminLog = require('../models/AdminLog');
const { validateFile, uploadMultipleToCloudinary, deleteFromCloudinary, rollbackUploads } = require('../services/uploadService');
const { hashFileFromDisk } = require('../services/uploadService');
const { hashFileBuffer, hashText } = require('../utils/hashFile');
const { checkDailyLimit } = require('../services/taskService');
const { cleanupTempFiles } = require('../middleware/uploadMiddleware');
const { isFileSafe, isFileBufferSafe } = require('../services/fileSecurityService');
const logger = require('../utils/logger');

const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'svg', 'tiff'];

const getTaskSubmissionConfig = (task) => ({
  inputType: task?.submissionConfig?.inputType || task?.inputType || 'file',
  allowedExtensions: task?.submissionConfig?.allowedExtensions || task?.allowedExtensions || ['*'],
  maxFileSize: task?.submissionConfig?.maxFileSize || task?.maxFileSize || (5 * 1024 * 1024),
});

const submitProof = async (req, res, next) => {
  // Track temp files for cleanup regardless of success/failure
  const filesToCleanup = req.files;

  try {
    const { taskId, textContent, linkUrl } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'Task ID is required' });
    
    // Validate ObjectId format to prevent CastError
    if (!/^[0-9a-fA-F]{24}$/.test(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid Task ID format' });
    }

    const userId = req.user._id;
    const user = req.user;

    if (!user.isProfileComplete) {
      return res.status(403).json({ success: false, message: 'Profile incomplete. Please complete your setup in the dashboard.' });
    }

    const task = await Task.findById(taskId);
    if (!task || !task.isActive) return res.status(404).json({ success: false, message: 'Task not found or inactive' });

    const existingCount = await Submission.countDocuments({ userId, taskId, status: { $in: ['pending', 'approved'] } });
    if (existingCount >= task.maxSubmissionsPerUser) return res.status(400).json({ success: false, message: 'Submission limit reached for this task' });

    const limitReached = await checkDailyLimit(userId);
    if (limitReached) {
      return res.status(400).json({ success: false, message: 'Daily limit of 8 tasks reached.' });
    }

    // Handle files
    let hasImage = false;
    let hasFile = false;

    const taskConfig = getTaskSubmissionConfig(task);
    const allowedFiles = taskConfig.allowedExtensions && taskConfig.allowedExtensions.length > 0 ? taskConfig.allowedExtensions : ['*'];

    if (req.files) {
      for (const file of req.files) {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (allowedImageExtensions.includes(ext)) {
          hasImage = true;
          validateFile(file, allowedImageExtensions, taskConfig.maxFileSize);
        } else {
          hasFile = true;
          validateFile(file, allowedFiles, taskConfig.maxFileSize);
        }

        if (file.path) {
          const safety = await isFileSafe(file.path, file.originalname, taskConfig.maxFileSize);
          if (!safety.safe) {
            return res.status(400).json({ success: false, message: safety.reason });
          }
        } else if (file.buffer) {
          const safety = await isFileBufferSafe(file.buffer, file.originalname, taskConfig.maxFileSize);
          if (!safety.safe) {
            return res.status(400).json({ success: false, message: safety.reason });
          }
        }
      }
    }

    // ─── HASH BEFORE UPLOAD (dedup optimization) ─────────
    let fileHash = null;
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      try {
        if (file.path) fileHash = await hashFileFromDisk(file.path);
        else if (file.buffer) fileHash = hashFileBuffer(file.buffer);
      } catch (err) { /* ignore */ }
    }
    if (textContent) fileHash = fileHash || hashText(textContent);
    if (linkUrl) fileHash = fileHash || hashText(linkUrl);

    // Check for duplicates BEFORE uploading to Cloudinary
    if (fileHash) {
      // Scoped to userId and taskId to prevent global hash collisions
      const dup = await Submission.findOne({ fileHash, userId, taskId, status: { $in: ['pending', 'approved'] } });
      if (dup) {
        return res.status(409).json({ success: false, message: 'Duplicate submission detected' });
      }
    }

    // Dynamic Validation based on inputType (before upload to catch early)
    const it = taskConfig.inputType;
    const hasText = !!textContent;
    const hasLink = !!linkUrl;

    if (it.includes('text') && !hasText) return res.status(400).json({ success: false, message: 'Text response is required' });
    if (it.includes('image') && !hasImage) return res.status(400).json({ success: false, message: 'Screenshot/Image is required' });
    if (it.includes('file') && !hasFile) return res.status(400).json({ success: false, message: 'File upload is required' });
    if (it.includes('link') && !hasLink && it !== 'text_link') return res.status(400).json({ success: false, message: 'URL/Link is required' });
    if (it === 'text_link' && (!hasText || !hasLink)) return res.status(400).json({ success: false, message: 'Both text and link are required' });
    if (it === 'all' && (!hasText || !hasImage || !hasFile || !hasLink)) return res.status(400).json({ success: false, message: 'Full evidence required: Text + Image + File + Link' });

    // ─── NOW UPLOAD (only after all validation + dedup passes) ───
    const uploadedAssets = []; // Track for rollback
    const attachments = [];

    try {
      if (req.files && req.files.length > 0) {
        const results = await uploadMultipleToCloudinary(req.files, 'earnetix/submissions', 3);
        for (const r of results) {
          if (r.success) {
            attachments.push({
              url: r.result.url,
              publicId: r.result.publicId,
              resourceType: r.result.resourceType,
              originalName: r.file.originalname
            });
            uploadedAssets.push({ publicId: r.result.publicId, resourceType: r.result.resourceType });
          } else {
            throw new Error(`Upload failed for ${r.file.originalname}: ${r.error}`);
          }
        }
      }
    } catch (uploadError) {
      // Upload failed — rollback any already-uploaded files
      await rollbackUploads(uploadedAssets);
      throw uploadError;
    }

    // ─── DB SAVE WITH ROLLBACK ───────────────────────────
    let submission;
    try {
      submission = await Submission.create({ 
        userId, taskId, textContent, linkUrl,
        attachments, fileHash 
      });
    } catch (dbError) {
      // DB save failed — rollback Cloudinary uploads to prevent orphans
      await rollbackUploads(uploadedAssets);
      throw dbError;
    }

    // Create System Log (non-critical — fire and forget)
    AdminLog.create({
      adminId: userId,
      action: 'task_submitted',
      targetType: 'submission',
      targetId: submission._id,
      details: `User submitted proof for task: ${task.title}`,
      ip: req.ip
    }).catch(err => console.error('Failed to log submission:', err));

    res.status(201).json({ success: true, message: 'Proof submitted successfully', data: submission });
  } catch (error) { next(error); }
  finally {
    // ALWAYS clean up temp files, even on errors
    cleanupTempFiles(filesToCleanup);
  }
};

const getMySubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const submissions = await Submission.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).populate('taskId', 'title rewardPoints inputType').lean();
    const total = await Submission.countDocuments(filter);
    res.json({ success: true, data: { submissions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

const resubmit = async (req, res, next) => {
  const filesToCleanup = req.files;

  try {
    const submission = await Submission.findOne({ _id: req.params.id, userId: req.user._id });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.status !== 'rejected' || !submission.canResubmit) return res.status(400).json({ success: false, message: 'Resubmission not allowed' });

    const task = await Task.findById(submission.taskId);
    if (!task || !task.isActive) return res.status(404).json({ success: false, message: 'Task no longer active' });

    let fileHash = null;
    
    // Files from .array('files', 5) middleware
    const taskConfig = getTaskSubmissionConfig(task);
    const allowedFiles = taskConfig.allowedExtensions && taskConfig.allowedExtensions.length > 0 ? taskConfig.allowedExtensions : ['*'];

    if (req.files) {
      for (const file of req.files) {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (allowedImageExtensions.includes(ext)) {
          validateFile(file, allowedImageExtensions, taskConfig.maxFileSize);
        } else {
          validateFile(file, allowedFiles, taskConfig.maxFileSize);
        }

        if (file.path) {
          const safety = await isFileSafe(file.path, file.originalname, taskConfig.maxFileSize);
          if (!safety.safe) {
            return res.status(400).json({ success: false, message: safety.reason });
          }
        } else if (file.buffer) {
          const safety = await isFileBufferSafe(file.buffer, file.originalname, taskConfig.maxFileSize);
          if (!safety.safe) {
            return res.status(400).json({ success: false, message: safety.reason });
          }
        }
      }
    }

    const { textContent, linkUrl } = req.body;

    // ─── UPLOAD NEW FILES FIRST (before deleting old ones) ───
    const newUploadedAssets = [];
    const newAttachments = [];

    try {
      if (req.files && req.files.length > 0) {
        const results = await uploadMultipleToCloudinary(req.files, 'earnetix/submissions', 3);
        for (const r of results) {
          if (r.success) {
            newAttachments.push({
              url: r.result.url,
              publicId: r.result.publicId,
              resourceType: r.result.resourceType,
              originalName: r.file.originalname
            });
            newUploadedAssets.push({ publicId: r.result.publicId, resourceType: r.result.resourceType });
          } else {
            throw new Error(`Upload failed for ${r.file.originalname}: ${r.error}`);
          }
        }
      }
    } catch (uploadError) {
      await rollbackUploads(newUploadedAssets);
      throw uploadError;
    }

    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      try {
        if (file.path) {
          fileHash = await hashFileFromDisk(file.path);
        } else if (file.buffer) {
          fileHash = hashFileBuffer(file.buffer);
        }
      } catch (err) { /* ignore */ }
    }
    if (textContent) fileHash = fileHash || hashText(textContent);
    if (linkUrl) fileHash = fileHash || hashText(linkUrl);

    // Dedup check (exclude current submission)
    if (fileHash) {
      const dup = await Submission.findOne({ _id: { $ne: submission._id }, userId: req.user._id, taskId: task._id, fileHash, status: { $in: ['pending', 'approved'] } });
      if (dup) { 
        // Rollback new uploads before returning
        await rollbackUploads(newUploadedAssets);
        return res.status(409).json({ success: false, message: 'Duplicate content' }); 
      }
    }

    // ─── SAVE TO DB, THEN DELETE OLD FILES ───────────────
    // Track old file IDs for deletion AFTER successful save
    const oldAssets = submission.attachments ? submission.attachments.map(a => ({ publicId: a.publicId, resourceType: a.resourceType })) : [];

    try {
      Object.assign(submission, {
        textContent: textContent || submission.textContent,
        linkUrl: linkUrl || submission.linkUrl,
        attachments: newAttachments.length > 0 ? newAttachments : submission.attachments,
        fileHash: fileHash || submission.fileHash,
        status: 'pending', rejectionReason: null, canResubmit: false,
        submissionCount: submission.submissionCount + 1, reviewedBy: null, reviewedAt: null,
      });
      await submission.save();
    } catch (dbError) {
      // DB save failed — rollback NEW uploads, keep old files safe
      await rollbackUploads(newUploadedAssets);
      throw dbError;
    }

    // ─── NOW SAFE TO DELETE OLD FILES ────────────────────
    // DB save succeeded — old files can be cleaned up
    for (const old of oldAssets) {
      deleteFromCloudinary(old.publicId, old.resourceType).catch(err => {
        logger.error(`[Resubmit] Failed to cleanup old file ${old.publicId}: ${err.message}`);
      });
    }

    res.json({ success: true, message: 'Resubmitted', data: submission });
  } catch (error) { next(error); }
  finally {
    cleanupTempFiles(filesToCleanup);
  }
};

module.exports = { submitProof, getMySubmissions, resubmit };
