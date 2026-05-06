const Submission = require('../models/Submission');
const Task = require('../models/Task');
const { validateFile, uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { hashText } = require('../utils/hashFile');

const submitProof = async (req, res, next) => {
  try {
    const { taskId, textContent } = req.body;
    const userId = req.user._id;
    const task = await Task.findById(taskId);
    if (!task || !task.isActive) return res.status(404).json({ success: false, message: 'Task not found or inactive' });

    const existingCount = await Submission.countDocuments({ userId, taskId, status: { $in: ['pending', 'approved'] } });
    if (existingCount >= task.maxSubmissionsPerUser) return res.status(400).json({ success: false, message: 'Submission limit reached for this task' });

    // Daily Limit Check: Only 8 tasks allowed per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dailyTasks = await Submission.distinct('taskId', {
      userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const dailyTaskIds = dailyTasks.map(id => id.toString());

    if (dailyTaskIds.length >= 8 && !dailyTaskIds.includes(taskId.toString())) {
      return res.status(400).json({ success: false, message: 'Daily limit of 8 tasks reached. Please try again tomorrow.' });
    }

    let imageUrl = null, imagePublicId = null, fileUrl = null, filePublicId = null, fileHash = null;

    // Handle files
    const imageFile = req.files?.image?.[0];
    const otherFile = req.files?.file?.[0];

    if (imageFile) {
      validateFile(imageFile, ['jpg', 'jpeg', 'png', 'webp'], task.maxFileSize);
      const r = await uploadToCloudinary(imageFile.buffer);
      imageUrl = r.url; imagePublicId = r.publicId; fileHash = r.hash;
    }

    if (otherFile) {
      validateFile(otherFile, task.allowedExtensions, task.maxFileSize);
      const r = await uploadToCloudinary(otherFile.buffer);
      fileUrl = r.url; filePublicId = r.publicId; 
      if (!fileHash) fileHash = r.hash; // prioritize image hash for duplicates, but use file hash if no image
    }

    if (textContent) fileHash = fileHash || hashText(textContent);

    // Dynamic Validation based on inputType
    const it = task.inputType;
    const hasText = !!textContent;
    const hasImage = !!imageUrl;
    const hasFile = !!fileUrl;

    if (it === 'text' && !hasText) return res.status(400).json({ success: false, message: 'Text response required' });
    if (it === 'image' && !hasImage) return res.status(400).json({ success: false, message: 'Screenshot required' });
    if (it === 'file' && !hasFile) return res.status(400).json({ success: false, message: 'File upload required' });
    if (it === 'text_image' && (!hasText || !hasImage)) return res.status(400).json({ success: false, message: 'Both text and screenshot required' });
    if (it === 'text_file' && (!hasText || !hasFile)) return res.status(400).json({ success: false, message: 'Both text and file required' });
    if (it === 'image_file' && (!hasImage || !hasFile)) return res.status(400).json({ success: false, message: 'Both screenshot and file required' });
    if (it === 'all' && (!hasText || !hasImage || !hasFile)) return res.status(400).json({ success: false, message: 'Text, screenshot, and file required' });

    if (fileHash) {
      const dup = await Submission.findOne({ fileHash, status: { $in: ['pending', 'approved'] } });
      if (dup) { 
        if (imagePublicId) await deleteFromCloudinary(imagePublicId); 
        if (filePublicId) await deleteFromCloudinary(filePublicId);
        return res.status(409).json({ success: false, message: 'Duplicate submission' }); 
      }
    }

    const submission = await Submission.create({ 
      userId, taskId, textContent, 
      imageUrl, imagePublicId, 
      fileUrl, filePublicId, 
      fileHash 
    });

    res.status(201).json({ success: true, message: 'Proof submitted', data: submission });
  } catch (error) { next(error); }
};

const getMySubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const submissions = await Submission.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).populate('taskId', 'title rewardPoints inputType');
    const total = await Submission.countDocuments(filter);
    res.json({ success: true, data: { submissions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

const resubmit = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({ _id: req.params.id, userId: req.user._id });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.status !== 'rejected' || !submission.canResubmit) return res.status(400).json({ success: false, message: 'Resubmission not allowed' });

    const task = await Task.findById(submission.taskId);
    if (!task || !task.isActive) return res.status(404).json({ success: false, message: 'Task no longer active' });

    // Delete old files
    if (submission.imagePublicId) await deleteFromCloudinary(submission.imagePublicId);
    if (submission.filePublicId) await deleteFromCloudinary(submission.filePublicId);

    let imageUrl = null, imagePublicId = null, fileUrl = null, filePublicId = null, fileHash = null;
    
    const imageFile = req.files?.image?.[0];
    const otherFile = req.files?.file?.[0];

    if (imageFile) {
      validateFile(imageFile, ['jpg', 'jpeg', 'png', 'webp'], task.maxFileSize);
      const r = await uploadToCloudinary(imageFile.buffer);
      imageUrl = r.url; imagePublicId = r.publicId; fileHash = r.hash;
    }

    if (otherFile) {
      validateFile(otherFile, task.allowedExtensions, task.maxFileSize);
      const r = await uploadToCloudinary(otherFile.buffer);
      fileUrl = r.url; filePublicId = r.publicId; 
      if (!fileHash) fileHash = r.hash;
    }

    const { textContent } = req.body;
    if (textContent) fileHash = fileHash || hashText(textContent);

    if (fileHash) {
      const dup = await Submission.findOne({ _id: { $ne: submission._id }, fileHash, status: { $in: ['pending', 'approved'] } });
      if (dup) { 
        if (imagePublicId) await deleteFromCloudinary(imagePublicId); 
        if (filePublicId) await deleteFromCloudinary(filePublicId);
        return res.status(409).json({ success: false, message: 'Duplicate content' }); 
      }
    }

    Object.assign(submission, {
      textContent: textContent || submission.textContent,
      imageUrl: imageUrl || submission.imageUrl,
      imagePublicId: imagePublicId || submission.imagePublicId,
      fileUrl: fileUrl || submission.fileUrl,
      filePublicId: filePublicId || submission.filePublicId,
      fileHash: fileHash || submission.fileHash,
      status: 'pending', rejectionReason: null, canResubmit: false,
      submissionCount: submission.submissionCount + 1, reviewedBy: null, reviewedAt: null,
    });
    await submission.save();
    res.json({ success: true, message: 'Resubmitted', data: submission });
  } catch (error) { next(error); }
};

module.exports = { submitProof, getMySubmissions, resubmit };
