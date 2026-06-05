const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header, verifies it, and attaches user to req.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    // Use lean() for massive performance boost, and only select necessary fields
    const user = await User.findById(decoded.userId)
      .select('isBlocked blockedUntil role')
      .lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account has been permanently blocked.' });
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      const remainingMs = user.blockedUntil - new Date();
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return res.status(403).json({ 
        success: false, 
        message: `Access restricted for ${hours}h ${minutes}m.`,
        code: 'TEMP_BLOCK',
        blockedUntil: user.blockedUntil
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

module.exports = auth;
