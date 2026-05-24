const router = require('express').Router();
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const {
  saveBankDetails, requestWithdrawal, getMyWithdrawals,
  getAllWithdrawals, completeWithdrawal, rejectWithdrawal, blockWithdrawalUser,
} = require('../controllers/withdrawalController');

// ─── USER ROUTES ───────────────────────────────────────
router.post('/bank-details', auth, saveBankDetails);
router.post('/request', auth, requestWithdrawal);
router.get('/my', auth, getMyWithdrawals);

// ─── ADMIN ROUTES ──────────────────────────────────────
router.get('/admin/all', auth, adminGuard, getAllWithdrawals);
router.put('/admin/:id/complete', auth, adminGuard, completeWithdrawal);
router.put('/admin/:id/reject', auth, adminGuard, rejectWithdrawal);
router.put('/admin/:id/block-user', auth, adminGuard, blockWithdrawalUser);
router.delete('/admin/:id', auth, adminGuard, require('../controllers/withdrawalController').deleteWithdrawal);

module.exports = router;
