/**
 * Admin role guard middleware.
 * Must be used AFTER the auth middleware.
 */
const adminGuard = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = adminGuard;
