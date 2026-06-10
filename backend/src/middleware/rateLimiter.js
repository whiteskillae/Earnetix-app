const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,             // 100 requests per minute
  message: { success: false, message: 'High traffic detected. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for login/auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin-specific rate limiter — higher ceiling but not unlimited
// Prevents a compromised admin account from flooding the API
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
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
