const multer = require('multer');

const storage = multer.memoryStorage();

// ─── SUBMISSION UPLOADS (User Evidence) ────────────────
// Images: 15MB limit, other files: 50MB (server-side practical limit for buffered uploads)
const uploadSubmissionFiles = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const ALLOWED = ['png', 'jpg', 'jpeg', 'webp', 'pdf'];
    if (!ALLOWED.includes(ext)) {
      return cb(new Error(`File type .${ext} is not allowed. Please upload PNG, JPG, WEBP, or PDF.`), false);
    }
    cb(null, true);
  },
}).array('files', 5);

const submissionUpload = (req, res, next) => {
  uploadSubmissionFiles(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ─── TASK ATTACHMENT UPLOADS (Admin) ───────────────────
const taskAttachmentUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per attachment
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const BLOCKED = ['exe', 'bat', 'cmd', 'sh', 'msi', 'com', 'scr', 'php', 'apk', 'dll'];
    if (BLOCKED.includes(ext)) {
      return cb(new Error(`File type .${ext} is not allowed`), false);
    }
    cb(null, true);
  },
}).array('attachments', 5);

module.exports = { submissionUpload, taskAttachmentUpload };
