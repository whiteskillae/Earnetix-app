const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  deviceFingerprint: z.string().optional(),
  captchaToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().optional(),
  captchaToken: z.string().optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
  deviceFingerprint: z.string().optional(),
});

module.exports = { registerSchema, loginSchema, verifyOtpSchema, googleAuthSchema };
