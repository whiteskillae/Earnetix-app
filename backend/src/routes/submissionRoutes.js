const router = require('express').Router();
const multer = require('multer');
const { submitProof, getMySubmissions, resubmit } = require('../controllers/submissionController');
const auth = require('../middleware/auth');

// Multer memory storage (buffer for hashing before Cloudinary upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB hard limit
});

router.post('/', auth, upload.single('image'), submitProof);
router.get('/my', auth, getMySubmissions);
router.put('/:id/resubmit', auth, upload.single('image'), resubmit);

module.exports = router;
