const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ─── TEMP DIRECTORY SETUP ─────────────────────────────────
// Using disk storage eliminates the RAM exhaustion risk of memoryStorage().
// A 5MB file on disk costs ~0MB RAM. 200 concurrent uploads on memory = 1GB RAM → OOM.
// On disk = negligible RAM footprint.
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'uploads');

// Ensure temp directory exists on module load
try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (err) {
  console.error(`Failed to create temp upload directory: ${err.message}`);
}

// ─── DISK STORAGE CONFIGURATION ───────────────────────────
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists for each request (safety check)
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    // Cryptographic unique filename prevents collisions and path traversal
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueId}${ext}`);
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
];

// ─── SUBMISSION UPLOADS (User Evidence) ────────────────
const uploadSubmissionFiles = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per attachment
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (BLOCKED.includes(ext)) {
      return cb(new Error(`File type .${ext} is not allowed`), false);
    }
    cb(null, true);
  },
}).array('attachments', 5);

// ─── TEMP FILE CLEANUP UTILITY ────────────────────────────
// Call this after processing req.files to clean up temp files
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  const fileList = Array.isArray(files) ? files : Object.values(files).flat();
  
  for (const file of fileList) {
    if (file.path) {
      fs.unlink(file.path, (err) => {
        // Silently ignore cleanup errors — file may already be deleted
        if (err && err.code !== 'ENOENT') {
          console.error(`[Cleanup] Failed to delete temp file ${file.path}: ${err.message}`);
        }
      });
    }
  }
};

module.exports = { submissionUpload, taskAttachmentUpload, cleanupTempFiles, TEMP_DIR };
