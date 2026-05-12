const User = require('../models/User');
const cache = require('../services/cacheService');

// ─── GET PROFILE ───────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE PROFILE ────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, mobileNumber, country, countryCode, qualifications, skills } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (country) user.country = country;
    if (countryCode) user.countryCode = countryCode;
    if (qualifications) user.qualifications = qualifications;
    if (skills) user.skills = skills;
    
    // Mark profile as complete if required fields are present
    if (user.mobileNumber && user.country && user.name) {
      user.isProfileComplete = true;
    }

    await user.save();

    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    next(error);
  }
};

// ─── GET LEADERBOARD ──────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const cachedLeaderboard = cache.get('leaderboard');
    if (cachedLeaderboard) {
      return res.json({ success: true, data: cachedLeaderboard, fromCache: true });
    }

    const topUsers = await User.find({ role: 'user' })
      .sort({ points: -1 })
      .limit(50)
      .select('name points country createdAt');

    // Cache for 10 minutes
    cache.set('leaderboard', topUsers, 600);

    res.json({ success: true, data: topUsers });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, getLeaderboard };
