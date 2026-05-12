const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../services/tokenService');
const { generateOTP, sendOTP } = require('../services/otpService');
const logger = require('../utils/logger');
const env = require('../config/env');

// ─── REGISTER ──────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, deviceFingerprint } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Check IP address for multi-accounting
    const ip = req.ip || req.connection.remoteAddress;
    if (ip) {
      const ipUser = await User.findOne({ registrationIp: ip });
      if (ipUser) {
        logger.warn(`Multi-account attempt from IP: ${ip}`);
        return res.status(403).json({
          success: false,
          message: 'An account already exists from this network/device. Only one account per device is allowed.',
        });
      }
    }

    // Check device fingerprint for multi-accounting
    if (deviceFingerprint) {
      const deviceUser = await User.findOne({ deviceFingerprint });
      if (deviceUser) {
        logger.warn(`Multi-account attempt from device: ${deviceFingerprint}`);
        return res.status(403).json({
          success: false,
          message: 'An account already exists on this device',
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate OTP
    const otp = generateOTP();

    // Create user (unverified)
    const user = await User.create({
      name,
      email,
      passwordHash,
      deviceFingerprint,
      registrationIp: ip,
      otp: { code: otp.code, expiresAt: otp.expiresAt },
    });

    // Send OTP email
    await sendOTP(email, otp.code);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      data: { email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

// ─── VERIFY OTP ────────────────────────────────────────
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    if (!user.otp.code || user.otp.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = { code: null, expiresAt: null };
    await user.save();

    res.json({ success: true, message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    next(error);
  }
};

// ─── RESEND OTP ────────────────────────────────────────
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const otp = generateOTP();
    user.otp = { code: otp.code, expiresAt: otp.expiresAt };
    await user.save();

    await sendOTP(email, otp.code);

    res.json({ success: true, message: 'New OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

// ─── LOGIN ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, deviceFingerprint } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({ success: false, message: 'Please use Google login for this account' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account has been blocked' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Track login
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    user.loginHistory.push({ ip, userAgent });
    if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(-20); // keep last 20

    // Update device fingerprint & Check for multi-accounting
    if (deviceFingerprint) {
      const otherUser = await User.findOne({ deviceFingerprint, _id: { $ne: user._id } });
      if (otherUser) {
        logger.warn(`Multi-account login attempt: User ${user.email} on device ${deviceFingerprint} already linked to ${otherUser.email}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Security Alert: This device is already associated with another account. Multi-accounting is prohibited.' 
        });
      }
      user.deviceFingerprint = deviceFingerprint;
    }

    // Generate tokens
    const payload = { userId: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true, // Always true for cross-site support with sameSite: none
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GOOGLE AUTH ───────────────────────────────────────
const googleAuth = async (req, res, next) => {
  try {
    const { credential, deviceFingerprint } = req.body;

    // Verify Google token via Google's userinfo endpoint
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`);
    if (!response.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const googleUser = await response.json();
    const { email, name, picture } = googleUser;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not provided by Google' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Check IP address
      const ip = req.ip || req.connection.remoteAddress;
      if (ip) {
        const ipUser = await User.findOne({ registrationIp: ip });
        if (ipUser) {
          logger.warn(`Multi-account attempt (Google) from IP: ${ip}`);
          return res.status(403).json({
            success: false,
            message: 'An account already exists from this network/device. Only one account per device is allowed.',
          });
        }
      }

      // Check device fingerprint
      if (deviceFingerprint) {
        const deviceUser = await User.findOne({ deviceFingerprint });
        if (deviceUser) {
          logger.warn(`Multi-account attempt (Google) from device: ${deviceFingerprint}`);
          return res.status(403).json({
            success: false,
            message: 'An account already exists on this device',
          });
        }
      }

      user = await User.create({
        name: name || email.split('@')[0],
        email,
        authProvider: 'google',
        isVerified: true,
        avatar: picture,
        deviceFingerprint,
        registrationIp: ip,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account has been blocked' });
    }

    // Track login
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    user.loginHistory.push({ ip, userAgent });
    if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(-20);

    if (deviceFingerprint) {
      const otherUser = await User.findOne({ deviceFingerprint, _id: { $ne: user._id } });
      if (otherUser) {
        logger.warn(`Multi-account Google login attempt: User ${user.email} on device ${deviceFingerprint} already linked to ${otherUser.email}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Security Alert: This device is already associated with another account.' 
        });
      }
      user.deviceFingerprint = deviceFingerprint;
    }

    // Generate tokens
    const payload = { userId: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: { accessToken, user: user.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};

// ─── REFRESH TOKEN ─────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const payload = { userId: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// ─── LOGOUT ────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── COMPLETE PROFILE ──────────────────────────────────
const completeProfile = async (req, res, next) => {
  try {
    const { name, mobileNumber, countryCode, country, qualifications, skills } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (countryCode) user.countryCode = countryCode;
    if (country) user.country = country;
    if (qualifications) user.qualifications = qualifications;
    if (skills) user.skills = skills;
    
    user.isProfileComplete = true;

    await user.save();

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, verifyOtp, resendOtp, login, googleAuth, refresh, logout, completeProfile };
