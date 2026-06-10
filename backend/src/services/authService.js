const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const cacheService = require('./cacheService');

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── CACHE KEYS ───────────────────────────────────────
const pendingKey = (email) => `pending_reg:${email.toLowerCase()}`;
const otpRateKey = (email) => `otp_rate:${email.toLowerCase()}`;
const loginAttemptKey = (email) => `login_attempts:${email.toLowerCase()}`;

// Max 15 attempts per minute; block for 30 minutes after that
const MAX_LOGIN_ATTEMPTS = 15;
const LOGIN_WINDOW_MS = 60 * 1000;      // 1 minute
const LOGIN_BLOCK_MS = 30 * 60 * 1000;  // 30 minutes

const checkLoginAttempts = (email) => {
  const key = loginAttemptKey(email);
  const data = cacheService.get(key) || { count: 0, firstAt: Date.now(), blockedUntil: 0 };

  if (data.blockedUntil && Date.now() < data.blockedUntil) {
    const minsLeft = Math.ceil((data.blockedUntil - Date.now()) / 60000);
    throw Object.assign(new Error(`Too many login attempts. Try again after ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`), { statusCode: 429 });
  }

  if (Date.now() - data.firstAt > LOGIN_WINDOW_MS) {
    data.count = 0;
    data.firstAt = Date.now();
  }

  data.count += 1;

  if (data.count >= MAX_LOGIN_ATTEMPTS) {
    data.blockedUntil = Date.now() + LOGIN_BLOCK_MS;
    cacheService.set(key, data, 30 * 60); 
    throw Object.assign(new Error('Too many login attempts. Try again after 30 minutes.'), { statusCode: 429 });
  }

  cacheService.set(key, data, 30 * 60);
};

const clearLoginAttempts = (email) => {
  cacheService.del(loginAttemptKey(email));
};

const getCacheOtpRate = (email) => {
  return cacheService.get(otpRateKey(email)) || null;
};

const checkCacheOtpRateLimit = (email) => {
  const now = Date.now();
  let rateData = getCacheOtpRate(email) || { dailyCount: 0, lastRequestAt: 0, lastDailyReset: now };

  if ((now - rateData.lastDailyReset) > 24 * 60 * 60 * 1000) {
    rateData.dailyCount = 0;
    rateData.lastDailyReset = now;
  }

  if (rateData.dailyCount >= 20) {
    throw new Error('Daily OTP request limit exceeded. Please try again tomorrow.');
  }

  if (rateData.lastRequestAt && (now - rateData.lastRequestAt) < 30 * 1000) {
    const secsLeft = Math.ceil((30 * 1000 - (now - rateData.lastRequestAt)) / 1000);
    throw new Error(`Please wait ${secsLeft} seconds before requesting another OTP.`);
  }

  rateData.dailyCount += 1;
  rateData.lastRequestAt = now;

  cacheService.set(otpRateKey(email), rateData, 24 * 60 * 60);
};

const checkOtpRateLimit = (user) => {
  const now = new Date();

  if (!user.otp.lastDailyReset || (now - user.otp.lastDailyReset) > 24 * 60 * 60 * 1000) {
    user.otp.dailyCount = 0;
    user.otp.lastDailyReset = now;
  }

  if (user.otp.dailyCount >= 20) {
    throw new Error('Daily OTP request limit exceeded. Please try again tomorrow.');
  }

  if (user.otp.lastRequestAt && (now - user.otp.lastRequestAt) < 30 * 1000) {
    throw new Error('Please wait 30 seconds before requesting another OTP.');
  }

  user.otp.dailyCount += 1;
  user.otp.lastRequestAt = now;
};

const verifyGoogleToken = async (credential) => {
  try {
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
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`);
    if (!response.ok) throw new Error('Invalid Google Token');
    const data = await response.json();
    return { ...data, method: 'access_token' };
  }
};

module.exports = {
  checkLoginAttempts,
  clearLoginAttempts,
  checkCacheOtpRateLimit,
  checkOtpRateLimit,
  verifyGoogleToken,
  pendingKey,
  otpRateKey
};
