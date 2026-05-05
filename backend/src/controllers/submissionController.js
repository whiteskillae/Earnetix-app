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
    if (existingCount >= task.maxSubmissionsPerUser) return res.status(400).json({ success: false, message: 'Submission limit reached' });

    let imageUrl = null, imagePublicId = null, fileHash = null;

    if (req.file) {
      validateFile(req.file, task.allowedExtensions, task.maxFileSize);
      const r = await uploadToCloudinary(req.file.buffer);
      imageUrl = r.url; imagePublicId = r.publicId; fileHash = r.hash;
    }
    if (textContent) fileHash = fileHash || hashText(textContent);

    if (task.inputType === 'image' && !imageUrl) return res.status(400).json({ success: false, message: 'Image required' });
    if (task.inputType === 'text' && !textContent) return res.status(400).json({ success: false, message: 'Text required' });
    if (task.inputType === 'both' && (!imageUrl || !textContent)) return res.status(400).json({ success: false, message: 'Both image and text required' });

    if (fileHash) {
      const dup = await Submission.findOne({ fileHash, status: { $in: ['pending', 'approved'] } });
      if (dup) { if (imagePublicId) await deleteFromCloudinary(imagePublicId); return res.status(409).json({ success: false, message: 'Duplicate submission' }); }
    }

    const submission = await Submission.create({ userId, taskId, textContent, imageUrl, imagePublicId, fileHash });
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

    if (submission.imagePublicId) await deleteFromCloudinary(submission.imagePublicId);

    let imageUrl = null, imagePublicId = null, fileHash = null;
    if (req.file) {
      validateFile(req.file, task.allowedExtensions, task.maxFileSize);
      const r = await uploadToCloudinary(req.file.buffer);
      imageUrl = r.url; imagePublicId = r.publicId; fileHash = r.hash;
    }
    const { textContent } = req.body;
    if (textContent) fileHash = fileHash || hashText(textContent);

    if (fileHash) {
      const dup = await Submission.findOne({ _id: { $ne: submission._id }, fileHash, status: { $in: ['pending', 'approved'] } });
      if (dup) { if (imagePublicId) await deleteFromCloudinary(imagePublicId); return res.status(409).json({ success: false, message: 'Duplicate content' }); }
    }

    Object.assign(submission, {
      textContent: textContent || submission.textContent,
      imageUrl: imageUrl || submission.imageUrl,
      imagePublicId: imagePublicId || submission.imagePublicId,
      fileHash: fileHash || submission.fileHash,
      status: 'pending', rejectionReason: null, canResubmit: false,
      submissionCount: submission.submissionCount + 1, reviewedBy: null, reviewedAt: null,
    });
    await submission.save();
    res.json({ success: true, message: 'Resubmitted', data: submission });
  } catch (error) { next(error); }
};

module.exports = { submitProof, getMySubmissions, resubmit };
