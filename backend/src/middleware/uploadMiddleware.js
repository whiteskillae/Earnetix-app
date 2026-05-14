const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// For submissions (user side)
const submissionUpload = upload.fields([
  { name: 'image', maxCount: 1 }, 
  { name: 'file', maxCount: 1 }
]);

// For task creation/editing (admin side)
const taskAttachmentUpload = upload.array('attachments', 5);

module.exports = { submissionUpload, taskAttachmentUpload };
