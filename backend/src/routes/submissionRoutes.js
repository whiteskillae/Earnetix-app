const router = require('express').Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { submitProof, getMySubmissions, resubmit } = require('../controllers/submissionController');
const auth = require('../middleware/auth');

// Multer memory storage (buffer for hashing before Cloudinary upload)
const BLOCKED = ['exe','bat','cmd','sh','msi','php','py','rb','apk','dll','js','jsx','ts','tsx','com','scr','vbs'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB hard limit
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (BLOCKED.includes(ext)) return cb(new Error(`File type .${ext} is not allowed`), false);
    cb(null, true);
  },
});

const uploadFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]);

// Upload throttle: max 20 submissions per 15 min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many uploads. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', auth, uploadLimiter, uploadFields, submitProof);
router.get('/my', auth, getMySubmissions);
router.put('/:id/resubmit', auth, uploadLimiter, uploadFields, resubmit);

module.exports = router;

