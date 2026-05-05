const router = require('express').Router();
const { register, verifyOtp, resendOtp, login, googleAuth, refresh, logout } = require('../controllers/authController');
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

module.exports = router;
