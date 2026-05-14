const multer = require('multer');

const storage = multer.memoryStorage();

// ─── SUBMISSION UPLOADS (User Evidence) ────────────────
// Images: 15MB limit, other files: 50MB (server-side practical limit for buffered uploads)
const submissionUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB hard limit per file
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const BLOCKED = [
      'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'msi', 'com', 'scr', 'pif',
      'vbs', 'vbe', 'wsf', 'wsh', 'php', 'py', 'rb', 'pl', 'cgi',
      'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
      'apk', 'ipa', 'dll', 'sys', 'jar', 'class',
      'htaccess', 'htpasswd',
    ];
    if (BLOCKED.includes(ext)) {
      return cb(new Error(`File type .${ext} is not allowed for security reasons`), false);
    }
    cb(null, true);
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

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
