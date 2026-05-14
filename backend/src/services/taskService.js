const Submission = require('../models/Submission');
const AssignedTask = require('../models/AssignedTask');

/**
 * Checks if a user has reached their daily task limit (8 tasks).
 * Includes both public task submissions and assigned task completions.
 */
const checkDailyLimit = async (userId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Count public task submissions
  const publicCount = await Submission.countDocuments({
    userId,
    status: { $in: ['pending', 'approved'] },
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  // Count assigned task completions (or in-review)
  const assignedCount = await AssignedTask.countDocuments({
    'submissions.userId': userId,
    status: { $in: ['under_review', 'completed'] },
    updatedAt: { $gte: startOfDay, $lte: endOfDay }
  });

  return (publicCount + assignedCount) >= 8;
};

module.exports = { checkDailyLimit };
