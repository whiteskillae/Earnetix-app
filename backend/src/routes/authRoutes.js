const router = require('express').Router();
const { register, verifyOtp, resendOtp, login, googleAuth, refresh, logout, completeProfile } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, verifyOtpSchema, googleAuthSchema } = require('../validators/authSchema');
const { authLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/resend-otp', authLimiter, resendOtp);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, validate(googleAuthSchema), googleAuth);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.post('/complete-profile', auth, completeProfile);
router.post('/request-password-otp', auth, requestPasswordChangeOTP);
router.post('/update-password', auth, updatePasswordWithOTP);

module.exports = router;
