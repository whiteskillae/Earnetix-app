const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS), // 15 minutes
  max: parseInt(env.RATE_LIMIT_MAX),             // 100 requests per window
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for login/auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // Reduced to 10 minutes as requested
  max: 15, // Increased limit for standard users
  message: { success: false, message: 'Too many attempts. Please try again in 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Allow admin to have no limit
  skip: (req) => {
    return req.body && req.body.email === env.ADMIN_EMAIL;
  }
});

module.exports = { apiLimiter, authLimiter };
