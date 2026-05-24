const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

// ─── REUSABLE AXIOS INSTANCE ──────────────────────────────
// Created once at module load — avoids cold-start cost on every send.
const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  timeout: 8000, // 8s per attempt
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ─── EMAIL QUEUE STATE ────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // exponential backoff

let queueLength = 0;

/**
 * Build the OTP email HTML template.
 */
const buildOtpHtml = (otpCode) => `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; border-radius: 16px;">
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

/**
 * Send a single OTP email via Brevo HTTP API.
 * Throws on failure (caller handles retry).
 */
const sendViaBrevo = async (email, otpCode) => {
  if (!env.BREVO_API_KEY) {
    throw new Error('API_KEY is not configured.');
  }

  await brevoClient.post('/smtp/email', {
    sender: {
      email: env.SMTP_USER || 'noreply@earnetix.com',
      name: 'EARNETIX',
    },
    to: [{ email }],
    subject: 'EARNETIX — Your Verification Code',
    htmlContent: buildOtpHtml(otpCode),
  }, {
    headers: { 'api-key': env.BREVO_API_KEY },
  });
};

/**
 * Process a single email job with retry logic.
 */
const processJob = async (job) => {
  const { email, otpCode, enqueuedAt } = job;
  const startMs = Date.now();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendViaBrevo(email, otpCode);

      const deliveryMs = Date.now() - startMs;
      const queueWaitMs = startMs - enqueuedAt;
      logger.info(`[EmailQueue] ✅ OTP delivered to ${email} | attempt=${attempt} | delivery=${deliveryMs}ms | queue_wait=${queueWaitMs}ms`);
      return; // success — exit
    } catch (err) {
      const errMsg = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        logger.warn(`[EmailQueue] ⚠️ Attempt ${attempt}/${MAX_RETRIES} failed for ${email}: ${errMsg}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error(`[EmailQueue] ❌ All ${MAX_RETRIES} attempts failed for ${email}: ${errMsg}`);
      }
    }
  }
};

/**
 * Enqueue an OTP email job.
 * This is NON-BLOCKING — it schedules the job and returns immediately.
 * The caller (controller) does NOT need to await this.
 *
 * @param {string} email - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 */
const enqueue = (email, otpCode) => {
  const job = {
    email,
    otpCode,
    enqueuedAt: Date.now(),
  };

  queueLength += 1;

  // Log OTP in development for easy testing
  if (env.NODE_ENV !== 'production') {
    logger.info(`======================================`);
    logger.info(`  DEV OTP for ${email}: ${otpCode}`);
    logger.info(`======================================`);
  }

  logger.info(`[EmailQueue] Job enqueued for ${email} | queue_size=${queueLength}`);

  // Schedule async processing — does NOT block the current event loop tick
  setImmediate(async () => {
    try {
      await processJob(job);
    } finally {
      queueLength = Math.max(0, queueLength - 1);
    }
  });
};

/**
 * Initialize the queue — call once at server startup to warm up
 * the Brevo client and validate API key presence.
 */
const initialize = () => {
  if (!env.BREVO_API_KEY) {
    logger.warn('[EmailQueue] ⚠️  BREVO_API_KEY not set — OTP emails will fail.');
  } else {
    logger.info('[EmailQueue] ✅ Email queue initialized with Brevo transport.');
  }
};

module.exports = { enqueue, initialize, get queueLength() { return queueLength; } };
