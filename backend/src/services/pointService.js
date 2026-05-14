const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Award points to a user — SINGLE SOURCE OF TRUTH for point modifications.
 * Uses MongoDB atomic $inc to prevent race conditions.
 * Points are ONLY added through this function after admin approval.
 */
const awardPoints = async (userId, points, adminId, submissionId, session = null) => {
  if (!userId || !points || points <= 0) {
    throw new Error('Invalid point award parameters');
  }

  const opts = session ? { session } : {};

  // Atomic increment — safe under concurrent access
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { points: points } },
    { new: true, runValidators: true, ...opts }
  );

  if (!user) {
    throw new Error('User not found');
  }

  logger.info(`Points awarded: ${points} to user ${userId} by admin ${adminId} for submission ${submissionId}`);

  return user.points;
};

/**
 * Adjust points by a delta (positive or negative).
 * Uses atomic $inc. Returns the updated user document.
 * For negative deltas, validates sufficient balance first via a conditional update.
 */
const adjustPointsAtomic = async (userId, delta, session = null) => {
  const opts = session ? { session } : {};

  if (delta < 0) {
    // Conditional atomic update: only decrement if user has enough points
    const user = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: Math.abs(delta) } },
      { $inc: { points: delta } },
      { new: true, runValidators: true, ...opts }
    );
    if (!user) {
      // Check if user exists or just had insufficient points
      const exists = await User.findById(userId).session(session || null);
      if (!exists) throw new Error('User not found');
      throw new Error(`Insufficient points. User has ${exists.points} points.`);
    }
    return user;
  }

  // Positive delta — straightforward atomic increment
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { points: delta } },
    { new: true, runValidators: true, ...opts }
  );
  if (!user) throw new Error('User not found');
  return user;
};

/**
 * Freeze points atomically for withdrawal requests.
 * Validates available balance (points - frozenPoints >= amount) atomically.
 */
const freezePoints = async (userId, amount, session = null) => {
  const opts = session ? { session } : {};

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      $expr: { $gte: [{ $subtract: ['$points', '$frozenPoints'] }, amount] }
    },
    { $inc: { frozenPoints: amount } },
    { new: true, runValidators: true, ...opts }
  );

  if (!user) {
    const exists = await User.findById(userId).session(session || null);
    if (!exists) throw new Error('User not found');
    const available = exists.points - exists.frozenPoints;
    throw new Error(`Insufficient available points. Available: ${available}`);
  }

  return user;
};

/**
 * Unfreeze points atomically (on withdrawal rejection).
 */
const unfreezePoints = async (userId, amount, session = null) => {
  const opts = session ? { session } : {};

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { frozenPoints: -amount } },
    { new: true, runValidators: true, ...opts }
  );

  if (!user) throw new Error('User not found');

  // Clamp frozenPoints to 0 if it went negative (safety)
  if (user.frozenPoints < 0) {
    await User.findByIdAndUpdate(userId, { $set: { frozenPoints: 0 } }, opts);
  }

  return user;
};

/**
 * Complete a withdrawal: deduct points + unfreeze atomically.
 */
const deductPointsForWithdrawal = async (userId, pointsUsed, session = null) => {
  const opts = session ? { session } : {};

  const user = await User.findOneAndUpdate(
    { _id: userId, points: { $gte: pointsUsed } },
    {
      $inc: { points: -pointsUsed, frozenPoints: -pointsUsed }
    },
    { new: true, runValidators: true, ...opts }
  );

  if (!user) {
    const exists = await User.findById(userId).session(session || null);
    if (!exists) throw new Error('User not found');
    throw new Error(`Insufficient points for withdrawal. User has ${exists.points} points.`);
  }

  // Clamp frozenPoints to 0 (safety)
  if (user.frozenPoints < 0) {
    await User.findByIdAndUpdate(userId, { $set: { frozenPoints: 0 } }, opts);
  }

  return user;
};

module.exports = {
  awardPoints,
  adjustPointsAtomic,
  freezePoints,
  unfreezePoints,
  deductPointsForWithdrawal,
};
