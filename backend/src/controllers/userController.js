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

// Helper to generate UID
const generateUID = async () => {
  let isUnique = false;
  let newUid;
  while (!isUnique) {
    newUid = 'E' + Math.floor(10000000 + Math.random() * 90000000); // E + 8 random digits
    const existing = await User.findOne({ uid: newUid });
    if (!existing) isUnique = true;
  }
  return newUid;
};

// ─── UPDATE PROFILE ────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, username, bio, mobileNumber, country, countryCode, qualifications, skills } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (country) user.country = country;
    if (countryCode) user.countryCode = countryCode;
    if (qualifications) user.qualifications = qualifications;
    
    if (skills) {
      if (Array.isArray(skills) && skills.length > 3) {
        return res.status(400).json({ success: false, message: 'You can select a maximum of 3 skills only.' });
      }
      user.skills = skills;
    }
    
    // Handle Username Update (Limit: Once every 30 days)
    if (username && username !== user.username) {
      const now = new Date();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      
      if (user.lastUsernameChange && (now - new Date(user.lastUsernameChange) < thirtyDaysInMs)) {
        const daysRemaining = Math.ceil((thirtyDaysInMs - (now - new Date(user.lastUsernameChange))) / (24 * 60 * 60 * 1000));
        return res.status(400).json({ 
          success: false, 
          message: `Username can only be changed once every 30 days. Please wait ${daysRemaining} more days.` 
        });
      }

      const existingUsername = await User.findOne({ username: new RegExp('^' + username + '$', 'i') });
      if (existingUsername && existingUsername._id.toString() !== user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      
      user.username = username;
      user.lastUsernameChange = now;
    }
    
    if (user.mobileNumber && user.country && user.name && user.username) {
      user.isProfileComplete = true;
      user.onboardingVersion = 1;
    }

    // Force mark username as modified to ensure save
    if (username) {
      user.markModified('username');
    }

    await user.save();
    
    // Return the fresh user object
    const updatedUser = await User.findById(user._id).select('-passwordHash -otp -refreshToken');

    res.json({ success: true, message: 'Profile updated', data: updatedUser });
  } catch (error) {
    // Handle mongoose duplicate key error specifically for username
    if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
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
      .select('name username uid avatar points country createdAt')
      .lean();

    // Add rank
    const rankedUsers = topUsers.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Cache for a shorter duration (30s) for near real-time feel
    cache.set('leaderboard', rankedUsers, 30);

    res.json({ success: true, data: rankedUsers });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, getLeaderboard };
