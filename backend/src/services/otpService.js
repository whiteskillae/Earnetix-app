const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

// --- COMMENTED OUT: OLD NODEMAILER CODE ---
// const nodemailer = require('nodemailer');
// const port = parseInt(env.SMTP_PORT || '587');
// const transporter = nodemailer.createTransport({
//   host: env.SMTP_HOST || 'smtp.gmail.com',
//   port: port,
//   secure: port === 465, // true for 465, false for other ports (STARTTLS)
//   auth: {
//     user: env.SMTP_USER,
//     pass: env.SMTP_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
//   connectionTimeout: 6000,   // 6s to establish connection
//   greetingTimeout: 5000,     // 5s to receive server greeting
//   socketTimeout: 10000,       // 10s for socket inactivity
// });
// ------------------------------------------

/**
 * Generate a 6-digit OTP with 10-min expiry.
 */
const generateOTP = () => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiresAt };
};

/**
 * Send OTP email using Brevo HTTP API to bypass Render SMTP Firewalls.
 */
const sendOTP = async (email, otpCode) => {
  if (env.NODE_ENV === 'development') {
    logger.info(`======================================`);
    logger.info(`  DEV OTP for ${email}: ${otpCode}`);
    logger.info(`======================================`);
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
    if (!env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not defined in environment variables.');
    }

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

    logger.info(`OTP email sent to ${email} via Brevo HTTP API`);
  } catch (error) {
    const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Failed to send OTP email to ${email} via Brevo: ${errorMsg}`);
    
    // --- COMMENTED OUT: OLD NODEMAILER SEND LOGIC ---
    // try {
    //   await transporter.sendMail({
    //     from: \`"EARNETIX" <\${env.SMTP_USER}>\`,
    //     to: email,
    //     subject: 'EARNETIX — Your Verification Code',
    //     html: htmlContent
    //   });
    //   logger.info(\`OTP email sent to \${email}\`);
    // } catch (nodemailerError) {
    //   logger.error(\`Failed to send OTP email to \${email}: \${nodemailerError.message}\`);
    //   throw new Error(\`SMTP Error: \${nodemailerError.message}\`);
    // }
    // ------------------------------------------------

    throw new Error(`Email Delivery Error: ${errorMsg}`);
  }
};

module.exports = { generateOTP, sendOTP };
