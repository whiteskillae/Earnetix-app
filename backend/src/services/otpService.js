const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit OTP with 10-minute expiry.
 * Uses crypto.randomInt for uniform distribution (not Math.random).
 */
const generateOTP = () => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiresAt };
};

module.exports = { generateOTP };
