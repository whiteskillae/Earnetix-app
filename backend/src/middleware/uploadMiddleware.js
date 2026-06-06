const multer = require('multer');
const storage = multer.memoryStorage();

// ─── SHARED BLOCKED EXTENSIONS ────────────────────────────
const BLOCKED = [
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'msi', 'com', 'scr', 'pif',
  'vbs', 'vbe', 'wsf', 'wsh', 'cpl', 'inf', 'reg', 'rgs',
  'php', 'py', 'rb', 'pl', 'cgi',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'apk', 'ipa', 'deb', 'rpm',
  'dll', 'sys', 'drv', 'so', 'dylib',
  'htaccess', 'htpasswd',
  'jar', 'class', 'war',
];

// ─── SUBMISSION UPLOADS (User Evidence) ────────────────
const uploadSubmissionFiles = multer({
  storage,
  // Let task-level validation enforce the actual limit after parsing.
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (BLOCKED.includes(ext)) {
      return cb(new Error(`File type .${ext} is not allowed for security reasons`), false);
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
    if (BLOCKED.includes(ext)) {
      return cb(new Error(`File type .${ext} is not allowed`), false);
    }
    cb(null, true);
  },
}).array('attachments', 5);

const cleanupTempFiles = (files) => {
  // No-op for memory storage
};

module.exports = { submissionUpload, taskAttachmentUpload, cleanupTempFiles };
