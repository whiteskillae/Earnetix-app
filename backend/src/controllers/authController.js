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

    // Check IP address for multi-accounting (only check against 'user' role)
    const ip = req.ip || req.connection.remoteAddress;
    if (ip) {
      const ipUser = await User.findOne({ registrationIp: ip, role: 'user' });
      if (ipUser) {
        logger.warn(`Multi-account attempt from IP: ${ip}`);
        return res.status(403).json({
          success: false,
          message: 'An account already exists from this network/device. Only one account per device is allowed.',
        });
      }
    }

    // Check device fingerprint for multi-accounting (only check against 'user' role)
    if (deviceFingerprint) {
      const deviceUser = await User.findOne({ deviceFingerprint, role: 'user' });
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
    if (deviceFingerprint && user.role === 'user') {
      const otherUser = await User.findOne({ deviceFingerprint, _id: { $ne: user._id }, role: 'user' });
      if (otherUser) {
        logger.warn(`Multi-account login attempt: User ${user.email} on device ${deviceFingerprint} already linked to ${otherUser.email}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Security Alert: This device is already associated with another account. Multi-accounting is prohibited.' 
        });
      }
      user.deviceFingerprint = deviceFingerprint;
    } else if (deviceFingerprint) {
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
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const googleAuth = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { credential, deviceFingerprint } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential missing' });

    // Step 1: Parallelize Google Token Verification and User Lookup
    // We try to verify as an ID Token first (faster/better), fallback to userinfo if it's an access token
    let googleUser;
    
    const verifyToken = async () => {
      try {
        // Try as ID Token first (faster local verification)
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        return { 
          email: payload.email, 
          name: payload.name, 
          picture: payload.picture,
          method: 'id_token'
        };
      } catch (err) {
        // Fallback to userinfo endpoint (Access Token)
        const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`);
        if (!response.ok) throw new Error('Invalid Google Token');
        const data = await response.json();
        return { ...data, method: 'access_token' };
      }
    };

    // Parallelize the external request and the first DB check
    const [googleInfo, existingUser] = await Promise.all([
      verifyToken(),
      User.findOne({ email: req.body.email || '' }) // Optimization: if email is in body, use it, else wait
    ]);

    googleUser = googleInfo;
    const { email, name, picture } = googleUser;
    let user = existingUser || await User.findOne({ email });

    logger.info(`[GoogleAuth] Token verified via ${googleUser.method} in ${Date.now() - startTime}ms`);

    if (!user) {
      const ip = req.ip || req.connection.remoteAddress;
      // Parallelize new user validation checks
      const [ipUser, deviceUser] = await Promise.all([
        ip ? User.findOne({ registrationIp: ip, role: 'user' }) : null,
        deviceFingerprint ? User.findOne({ deviceFingerprint, role: 'user' }) : null
      ]);

      if (ipUser) {
        logger.warn(`Multi-account attempt (IP) for ${email}`);
        return res.status(403).json({ success: false, message: 'Only one account per device allowed.' });
      }
      if (deviceUser) {
        logger.warn(`Multi-account attempt (Device) for ${email}`);
        return res.status(403).json({ success: false, message: 'Device already linked to another account.' });
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

    if (user.isBlocked) return res.status(403).json({ success: false, message: 'Account blocked' });

    // Track login and finalize
    const ip = req.ip || req.connection.remoteAddress;
    user.loginHistory.push({ ip, userAgent: req.headers['user-agent'] || 'unknown' });
    if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(-20);
    
    // Multi-account protection for standard users
    if (deviceFingerprint) {
      if (user.role === 'user') {
        const otherUser = await User.findOne({ deviceFingerprint, _id: { $ne: user._id }, role: 'user' });
        if (otherUser) {
          logger.warn(`Multi-account Google login attempt: User ${user.email} on device ${deviceFingerprint} already linked to ${otherUser.email}`);
          return res.status(403).json({ 
            success: false, 
            message: 'Security Alert: This device is already associated with another account.' 
          });
        }
      }
      user.deviceFingerprint = deviceFingerprint;
    }

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

    logger.info(`[GoogleAuth] Total processing time: ${Date.now() - startTime}ms`);
    res.json({
      success: true,
      data: { accessToken, user: user.toJSON() },
    });
  } catch (error) {
    logger.error(`[GoogleAuth] Error: ${error.message}`);
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
    
    if (skills) {
      if (Array.isArray(skills) && skills.length > 3) {
        return res.status(400).json({ success: false, message: 'You can select a maximum of 3 skills only.' });
      }
      user.skills = skills;
    }
    
    user.isProfileComplete = true;
    user.onboardingVersion = 1; // Current version

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
