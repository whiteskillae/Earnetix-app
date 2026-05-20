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

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});

const verifyForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

module.exports = { 
  registerSchema, loginSchema, verifyOtpSchema, googleAuthSchema,
  forgotPasswordSchema, verifyForgotPasswordSchema, resetPasswordSchema
};
