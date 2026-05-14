const Submission = require('../models/Submission');
const Task = require('../models/Task');
const { validateFile, uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { hashText } = require('../utils/hashFile');
const { checkDailyLimit } = require('../services/taskService');

const submitProof = async (req, res, next) => {
  try {
    const { taskId, textContent, linkUrl } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'Task ID is required' });
    
    // Validate ObjectId format to prevent CastError
    if (!/^[0-9a-fA-F]{24}$/.test(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid Task ID format' });
    }

    const userId = req.user._id;
    const task = await Task.findById(taskId);
    if (!task || !task.isActive) return res.status(404).json({ success: false, message: 'Task not found or inactive' });

    const existingCount = await Submission.countDocuments({ userId, taskId, status: { $in: ['pending', 'approved'] } });
    if (existingCount >= task.maxSubmissionsPerUser) return res.status(400).json({ success: false, message: 'Submission limit reached for this task' });

    const limitReached = await checkDailyLimit(userId);
    if (limitReached) {
      return res.status(400).json({ success: false, message: 'Daily limit of 8 tasks reached.' });
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
      if (!fileHash) fileHash = r.hash;
    }

    if (textContent) fileHash = fileHash || hashText(textContent);
    if (linkUrl) fileHash = fileHash || hashText(linkUrl);

    // Dynamic Validation based on inputType
    const it = task.inputType;
    const hasText = !!textContent;
    const hasImage = !!imageUrl;
    const hasFile = !!fileUrl;
    const hasLink = !!linkUrl;

    if (it === 'text' && !hasText) return res.status(400).json({ success: false, message: 'Text response required' });
    if (it === 'image' && !hasImage) return res.status(400).json({ success: false, message: 'Screenshot required' });
    if (it === 'file' && !hasFile) return res.status(400).json({ success: false, message: 'File upload required' });
    if (it === 'link' && !hasLink) return res.status(400).json({ success: false, message: 'Link/URL required' });
    if (it === 'text_image' && (!hasText || !hasImage)) return res.status(400).json({ success: false, message: 'Both text and screenshot required' });
    if (it === 'text_link' && (!hasText || !hasLink)) return res.status(400).json({ success: false, message: 'Both text and link required' });
    if (it === 'all' && (!hasText || !hasImage || !hasFile || !hasLink)) return res.status(400).json({ success: false, message: 'All evidence types required' });

    if (fileHash) {
      const dup = await Submission.findOne({ fileHash, status: { $in: ['pending', 'approved'] } });
      if (dup) { 
        if (imagePublicId) await deleteFromCloudinary(imagePublicId); 
        if (filePublicId) await deleteFromCloudinary(filePublicId);
        return res.status(409).json({ success: false, message: 'Duplicate submission' }); 
      }
    }

    const submission = await Submission.create({ 
      userId, taskId, textContent, linkUrl,
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
