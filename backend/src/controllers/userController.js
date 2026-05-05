const User = require('../models/User');

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
    const { name } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    await user.save();

    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile };
