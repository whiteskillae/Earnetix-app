const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Award points to a user — SINGLE SOURCE OF TRUTH for point modifications.
 * Points are ONLY added through this function after admin approval.
 */
const awardPoints = async (userId, points, adminId, submissionId) => {
  if (!userId || !points || points <= 0) {
    throw new Error('Invalid point award parameters');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.points += points;
  await user.save();

  logger.info(`Points awarded: ${points} to user ${userId} by admin ${adminId} for submission ${submissionId}`);

  return user.points;
};

module.exports = { awardPoints };
