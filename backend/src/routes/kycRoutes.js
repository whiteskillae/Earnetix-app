const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const { submitKyc, getKycStatus, getPendingKyc, verifyKyc, rejectKyc, blockUserKyc } = require('../controllers/kycController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── USER ROUTES ───────────────────────────────────────
router.post('/submit', auth, upload.fields([{ name: 'document', maxCount: 1 }]), submitKyc);
router.get('/status', auth, getKycStatus);

// ─── ADMIN ROUTES ──────────────────────────────────────
router.get('/admin/list', auth, adminGuard, getPendingKyc);
router.put('/admin/:id/verify', auth, adminGuard, verifyKyc);
router.put('/admin/:id/reject', auth, adminGuard, rejectKyc);
router.put('/admin/:id/block', auth, adminGuard, blockUserKyc);

module.exports = router;
