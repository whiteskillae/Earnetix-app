const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const { submitKyc, getKycStatus, getPendingKyc, verifyKyc, rejectKyc, blockUserKyc, getFullKycUser } = require('../controllers/kycController');
const { TEMP_DIR, cleanupTempFiles, diskStorage, fileFilter, validateMagicBytesMiddleware } = require('../middleware/uploadMiddleware');

const upload = multer({ storage: diskStorage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB

// Wrapper to ensure cleanup and validation
const handleKycUpload = (req, res, next) => {
  upload.fields([{ name: 'document', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    validateMagicBytesMiddleware(req, res, next);
  });
};

// ─── USER ROUTES ───────────────────────────────────────
router.post('/submit', auth, handleKycUpload, submitKyc);
router.get('/status', auth, getKycStatus);

// ─── ADMIN ROUTES ──────────────────────────────────────
router.get('/admin/list', auth, adminGuard, getPendingKyc);
router.put('/admin/:id/verify', auth, adminGuard, verifyKyc);
router.put('/admin/:id/reject', auth, adminGuard, rejectKyc);
router.put('/admin/:id/block', auth, adminGuard, blockUserKyc);
router.get('/admin/:id/full', auth, adminGuard, getFullKycUser);

module.exports = router;
