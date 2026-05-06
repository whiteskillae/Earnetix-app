const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns sanitized JSON.
 */
const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Invalid data provided', errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Default server error — never expose stack in production
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
