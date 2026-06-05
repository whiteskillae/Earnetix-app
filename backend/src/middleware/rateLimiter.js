const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: 50000000,             // Removed rate limit bottleneck (50M)
  message: { success: false, message: 'High traffic detected. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // No longer skipping admin routes — they now have their own dedicated limiter
});

// Strict limiter for login/auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  message: { success: false, message: 'Too many attempts. Please try again in 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin-specific rate limiter — higher ceiling but not unlimited
// Prevents a compromised admin account from flooding the API
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window — very generous for admin operations
  message: { success: false, message: 'Admin rate limit reached. Please wait before making more requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload-specific rate limiter — stricter to prevent storage abuse
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 uploads per 5 minutes per IP
  message: { success: false, message: 'Upload rate limit reached. Please wait before uploading more files.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, adminLimiter, uploadLimiter };
