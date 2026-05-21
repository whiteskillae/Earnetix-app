const nodemailer = require('nodemailer');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

const port = parseInt(env.SMTP_PORT || '465');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: port,
  secure: port === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  // Strict timeouts to avoid hanging requests
  connectionTimeout: 6000,   // 6s to establish connection
  greetingTimeout: 5000,     // 5s to receive server greeting
  socketTimeout: 10000,       // 10s for socket inactivity
  tls: {
    rejectUnauthorized: false, // allow self-signed certs in dev
  },
});

/**
 * Generate a 6-digit OTP with 10-min expiry.
 */
const generateOTP = () => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiresAt };
};

/**
 * Send OTP email.
 * In development, if SMTP fails, logs the OTP to the console so local
 * testing is never blocked by firewall/ISP restrictions.
 */
const sendOTP = async (email, otpCode) => {
  // Always log in dev so you can test without real SMTP
  if (env.NODE_ENV === 'development') {
    logger.info(`======================================`);
    logger.info(`  DEV OTP for ${email}: ${otpCode}`);
    logger.info(`======================================`);
  }

  const mailOptions = {
    from: `"EARNETIX" <${env.SMTP_USER}>`,
    to: email,
    subject: 'EARNETIX — Your Verification Code',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; border-radius: 16px;">
        <h1 style="color: #0066FF; font-size: 28px; margin-bottom: 8px;">EARNETIX</h1>
        <p style="color: #888; font-size: 14px; margin-bottom: 24px;">Earn Through Content. Grow with Skills.</p>
        <p style="color: #fff; font-size: 16px;">Your verification code is:</p>
        <div style="background: linear-gradient(135deg, #0066FF, #00D166); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="color: #fff; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otpCode}</span>
        </div>
        <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;" />
        <p style="color: #555; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
    // Always throw an error so the frontend knows the email failed to send.
    // In production, this helps identify SMTP or IP blocking issues.
    throw new Error('Failed to send verification email. Please try again or check SMTP configuration.');
  }
};

module.exports = { generateOTP, sendOTP };
