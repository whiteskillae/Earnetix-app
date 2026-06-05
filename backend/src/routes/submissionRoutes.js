const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { submitProof, getMySubmissions, resubmit } = require('../controllers/submissionController');
const auth = require('../middleware/auth');
const { submissionUpload } = require('../middleware/uploadMiddleware');

// Multer now uses disk storage (defined in uploadMiddleware.js)
// No longer buffers files in memory — prevents OOM on concurrent uploads

// Upload throttle: max 20 submissions per 15 min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many uploads. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Submission upload uses the shared submissionUpload middleware which handles
// multer configuration for both 'image' and 'file' fields.
// Note: submissionUpload uses .array('files', 5) — controllers access req.files.
router.post('/', auth, uploadLimiter, submissionUpload, submitProof);
router.get('/my', auth, getMySubmissions);
router.put('/:id/resubmit', auth, uploadLimiter, submissionUpload, resubmit);

module.exports = router;
