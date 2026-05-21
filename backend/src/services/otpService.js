const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Generate a 6-digit OTP with 10-min expiry.
 */
const generateOTP = () => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiresAt };
};

/**
 * Send OTP email using HTTP APIs (Resend or Brevo) to bypass Render SMTP Firewalls.
 */
const sendOTP = async (email, otpCode) => {
  // Always log in dev so you can test without real API limits
  if (env.NODE_ENV === 'development') {
    logger.info(`======================================`);
    logger.info(`  DEV OTP for ${email}: ${otpCode}`);
    logger.info(`======================================`);
    
    // If no API key is provided in development, we just bypass and return success
    if (!env.BREVO_API_KEY && !env.RESEND_API_KEY) {
      return; 
    }
  }

  const htmlContent = `
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
  `;

  try {
    if (env.RESEND_API_KEY) {
      // Send via Resend API
      await axios.post('https://api.resend.com/emails', {
        from: env.SMTP_USER || 'onboarding@resend.dev',
        to: email,
        subject: 'EARNETIX — Your Verification Code',
        html: htmlContent
      }, {
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } else if (env.BREVO_API_KEY) {
      // Send via Brevo API
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { email: env.SMTP_USER || 'noreply@earnitix.com', name: 'EARNETIX' },
        to: [{ email }],
        subject: 'EARNETIX — Your Verification Code',
        htmlContent
      }, {
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } else {
      throw new Error('No API Key found. Please add RESEND_API_KEY or BREVO_API_KEY to Render Environment Variables.');
    }

    logger.info(`OTP email sent to ${email} via HTTP API`);
  } catch (error) {
    const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Failed to send OTP email to ${email}: ${errorMsg}`);
    throw new Error(`Email Delivery Error: ${errorMsg}`);
  }
};

module.exports = { generateOTP, sendOTP };
