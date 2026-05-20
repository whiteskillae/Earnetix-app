const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../services/tokenService');
const { generateOTP, sendOTP } = require('../services/otpService');
const logger = require('../utils/logger');
const env = require('../config/env');
const cacheService = require('../services/cacheService');

const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

const verifyCaptcha = async (token, action = 'default') => {
  return true;
};

const jwt = require('jsonwebtoken');

// ─── CACHE KEYS ───────────────────────────────────────
const pendingKey = (email) => `pending_reg:${email.toLowerCase()}`;
const otpRateKey = (email) => `otp_rate:${email.toLowerCase()}`;

// ─── HELPER: OTP Rate Limit (cache-based for pending registrations) ───────────
/**
 * Returns current rate-limit data from cache for a given email.
 * Returns null if no data yet.
 */
const getCacheOtpRate = (email) => {
  return cacheService.get(otpRateKey(email)) || null;
};

const checkCacheOtpRateLimit = (email) => {
  const now = Date.now();
  let rateData = getCacheOtpRate(email) || { dailyCount: 0, lastRequestAt: 0, lastDailyReset: now };

  // Reset daily count if 24h passed
  if ((now - rateData.lastDailyReset) > 24 * 60 * 60 * 1000) {
    rateData.dailyCount = 0;
    rateData.lastDailyReset = now;
  }

  if (rateData.dailyCount >= 4) {
    throw new Error('Daily OTP request limit exceeded. Please try again tomorrow.');
  }

  if (rateData.lastRequestAt && (now - rateData.lastRequestAt) < 2 * 60 * 1000) {
    const secsLeft = Math.ceil((2 * 60 * 1000 - (now - rateData.lastRequestAt)) / 1000);
    throw new Error(`Please wait ${secsLeft} seconds before requesting another OTP.`);
  }

  rateData.dailyCount += 1;
  rateData.lastRequestAt = now;

  // Store rate data with 24h TTL
  cacheService.set(otpRateKey(email), rateData, 24 * 60 * 60);
};

// ─── HELPER: OTP Rate Limit for verified DB users (e.g. forgot password) ─────
const checkOtpRateLimit = (user) => {
  const now = new Date();

  if (!user.otp.lastDailyReset || (now - user.otp.lastDailyReset) > 24 * 60 * 60 * 1000) {
    user.otp.dailyCount = 0;
    user.otp.lastDailyReset = now;
  }

  if (user.otp.dailyCount >= 4) {
    throw new Error('Daily OTP request limit exceeded. Please try again tomorrow.');
  }

  if (user.otp.lastRequestAt && (now - user.otp.lastRequestAt) < 2 * 60 * 1000) {
    throw new Error('Please wait 2 minutes before requesting another OTP.');
  }

  user.otp.dailyCount += 1;
  user.otp.lastRequestAt = now;
};

// ─── HELPER: Cookie options ────────────────────────────
const getCookieOptions = () => {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

// ─── REGISTER ──────────────────────────────────────────
// Only stores data in-memory cache. No DB write until OTP verified.
const register = async (req, res, next) => {
  try {
    const { name, email, password, deviceFingerprint } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // 1. Block if email is already registered & verified
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ success: false, message: 'Email already registered. Please log in.' });
    }

    // 2. Apply cache-based OTP rate limiting
    try {
      checkCacheOtpRateLimit(email);
    } catch (err) {
      return res.status(429).json({ success: false, message: err.message });
    }

    // 3. Hash password and generate OTP
    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();

    // 4. Store pending registration in cache (15-min TTL)
    cacheService.set(pendingKey(email), {
      name,
      email: email.toLowerCase(),
      passwordHash,
      deviceFingerprint,
      registrationIp: ip,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt.getTime(),
      },
    }, 15 * 60); // 15 minutes TTL

    // 5. Send OTP (non-blocking in dev if SMTP fails)
    await sendOTP(email, otp.code);

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.',
      data: { email: email.toLowerCase() },
    });
  } catch (error) {
    next(error);
  }
};

// ─── VERIFY OTP ────────────────────────────────────────
// Reads from cache, creates user in DB only on success.
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const pending = cacheService.get(pendingKey(email));

    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found. Please register again.',
      });
    }

    if (!pending.otp.code || Date.now() > pending.otp.expiresAt) {
      cacheService.del(pendingKey(email));
      return res.status(400).json({ success: false, message: 'OTP expired. Please register again.' });
    }

    if (pending.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid — create the user in the database NOW
    // Check one more time in case someone registered from another device
    const existingUser = await User.findOne({ email: pending.email });
    if (existingUser && existingUser.isVerified) {
      cacheService.del(pendingKey(email));
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    await User.create({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      deviceFingerprint: pending.deviceFingerprint,
      registrationIp: pending.registrationIp,
      isVerified: true,
    });

    // Clean up cache
    cacheService.del(pendingKey(email));
    cacheService.del(otpRateKey(email));

    logger.info(`[register] New user created: ${pending.email}`);

    return res.status(201).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── RESEND OTP ────────────────────────────────────────
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const pending = cacheService.get(pendingKey(email));
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found. Please register again.',
      });
    }

    // Apply rate limiting
    try {
      checkCacheOtpRateLimit(email);
    } catch (err) {
      return res.status(429).json({ success: false, message: err.message });
    }

    const otp = generateOTP();

    // Update OTP in cache, keeping original registration data
    cacheService.set(pendingKey(email), {
      ...pending,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt.getTime(),
      },
    }, 15 * 60);

    await sendOTP(email, otp.code);

    res.json({ success: true, message: 'New verification code sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// ─── LOGIN ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, deviceFingerprint } = req.body;

    // Direct Admin login override using environment variables
    const adminEmail = env.ADMIN_EMAIL;
    const adminPassword = env.ADMIN_PASSWORD;

    if (adminEmail && email === adminEmail && adminPassword && password === adminPassword) {
      let adminUser = await User.findOne({ email: adminEmail });
      if (!adminUser) {
        // Create the admin user on the fly if not exists
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        adminUser = await User.create({
          name: 'System Admin',
          email: adminEmail,
          passwordHash,
          role: 'admin',
          isVerified: true,
          registrationIp: req.ip || '127.0.0.1',
        });
      } else {
        // Sync role, authProvider and password if needed
        let adminChanged = false;
        if (adminUser.role !== 'admin') {
          adminUser.role = 'admin';
          adminChanged = true;
        }
        if (adminUser.authProvider !== 'local') {
          adminUser.authProvider = 'local';
          adminChanged = true;
        }
        const isMatch = await bcrypt.compare(adminPassword, adminUser.passwordHash);
        if (!isMatch) {
          adminUser.passwordHash = await bcrypt.hash(adminPassword, 12);
          adminChanged = true;
        }
        if (adminChanged) {
          await adminUser.save();
        }
      }

      const payload = { userId: adminUser._id, role: 'admin' };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      adminUser.refreshToken = refreshToken;
      await adminUser.save();

      res.cookie('refreshToken', refreshToken, getCookieOptions());

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          user: adminUser.toJSON(),
        },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({ success: false, message: 'Please use Google login for this account' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first before logging in.' });
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

    if (user.role !== 'admin' && deviceFingerprint) {
      user.deviceFingerprint = deviceFingerprint;
    }

    // Generate tokens
    const payload = { userId: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie (environment-aware)
    res.cookie('refreshToken', refreshToken, getCookieOptions());

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
      User.findOne({ email: req.body.email || '' })
    ]);

    googleUser = googleInfo;
    const { email, name, picture } = googleUser;
    let user = existingUser || await User.findOne({ email });

    logger.info(`[GoogleAuth] Token verified via ${googleUser.method} in ${Date.now() - startTime}ms`);

    if (!user) {
      const ip = req.ip || req.connection.remoteAddress;

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
    
    if (user.role !== 'admin' && deviceFingerprint) {
      user.deviceFingerprint = deviceFingerprint;
    }

    const payload = { userId: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token cookie (environment-aware)
    res.cookie('refreshToken', refreshToken, getCookieOptions());

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

    res.cookie('refreshToken', newRefreshToken, getCookieOptions());

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

    // Clear cookie with matching options so browsers honour the deletion
    const isProd = env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── COMPLETE PROFILE ──────────────────────────────────
const completeProfile = async (req, res, next) => {
  try {
    const { name, username, bio, mobileNumber, countryCode, country, qualifications, skills } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
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

    if (username) {
      user.markModified('username');
    }

    await user.save();
    
    // Return the fresh user object
    const updatedUser = await User.findById(user._id).select('-passwordHash -otp -refreshToken');

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: { user: updatedUser.toJSON() }
    });
  } catch (error) {
    next(error);
  }
};

// ─── FORGOT PASSWORD ───────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.authProvider === 'google') {
      return res.status(400).json({ success: false, message: 'Please use Google login for this account' });
    }

    try {
      checkOtpRateLimit(user);
    } catch (err) {
      return res.status(429).json({ success: false, message: err.message });
    }

    const otp = generateOTP();
    user.otp.code = otp.code;
    user.otp.expiresAt = otp.expiresAt;
    await user.save();

    await sendOTP(email, otp.code);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.otp.code || user.otp.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }
    if (user.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified, clear it
    user.otp.code = null;
    user.otp.expiresAt = null;
    await user.save();

    // Generate a temporary reset token (valid for 15 mins)
    const resetToken = jwt.sign({ email: user.email }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    res.json({ success: true, message: 'OTP verified', data: { resetToken } });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing token or password' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  register, verifyOtp, resendOtp, login, googleAuth, 
  refresh, logout, completeProfile, verifyCaptcha,
  forgotPassword, verifyForgotPasswordOtp, resetPassword
};
