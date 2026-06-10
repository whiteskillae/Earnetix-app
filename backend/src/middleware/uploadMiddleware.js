const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { validateMagicBytes } = require('../utils/magicBytes');

const TEMP_DIR = path.join(os.tmpdir(), 'earnetix_uploads');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    cb(null, `${crypto.randomUUID()}.${ext}`);
  }
});

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
  'html', 'htm'
];

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (BLOCKED.includes(ext)) {
    return cb(new Error(`File type .${ext} is not allowed for security reasons`), false);
  }
  cb(null, true);
};

// ─── MAGIC BYTES VALIDATOR MIDDLEWARE ─────────────────
const validateMagicBytesMiddleware = async (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  
  if (Array.isArray(files)) {
    for (const file of files) {
      try {
        await validateMagicBytes(file.path, file.originalname);
      } catch (err) {
        cleanupTempFiles(files);
        return res.status(400).json({ success: false, message: err.message });
      }
    }
  } else {
    // For object map (like req.files['document'][0])
    for (const key of Object.keys(files)) {
      for (const file of files[key]) {
        try {
          await validateMagicBytes(file.path, file.originalname);
        } catch (err) {
          cleanupTempFiles(req.files);
          return res.status(400).json({ success: false, message: err.message });
        }
      }
    }
  }
  next();
};

// ─── SUBMISSION UPLOADS (User Evidence: Max 25MB) ────────────────
const uploadSubmissionFiles = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter,
}).array('files', 5);

const submissionUpload = (req, res, next) => {
  uploadSubmissionFiles(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    validateMagicBytesMiddleware(req, res, next);
  });
};

// ─── TASK ATTACHMENT UPLOADS (Admin: Max 25MB) ───────────────────
const taskAttachmentUploadRaw = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter,
}).array('attachments', 5);

const taskAttachmentUpload = (req, res, next) => {
  taskAttachmentUploadRaw(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    validateMagicBytesMiddleware(req, res, next);
  });
};

// ─── PROFILE UPLOAD (Max 4MB) ───────────────────
const profileUploadRaw = multer({
  storage: diskStorage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter,
}).single('avatar');

const profileUpload = (req, res, next) => {
  profileUploadRaw(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    validateMagicBytesMiddleware(req, res, next);
  });
};

const cleanupTempFiles = (files) => {
  if (!files) return;
  const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
  for (const file of fileArray) {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error('Failed to cleanup temp file:', file.path);
      }
    }
  }
};

module.exports = { submissionUpload, taskAttachmentUpload, profileUpload, cleanupTempFiles, TEMP_DIR, validateMagicBytesMiddleware, diskStorage, fileFilter };
