const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');

/**
 * Optional JWT authentication middleware.
 * If token is present, it extracts and attaches req.user.
 * If token is absent or invalid, it still proceeds without req.user.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-passwordHash -otp -refreshToken');
    if (user && !user.isBlocked) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // If token is invalid or expired, just proceed as an unauthenticated user
    next();
  }
};

module.exports = optionalAuth;
