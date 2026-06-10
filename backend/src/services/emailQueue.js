const env = require('../config/env');
const logger = require('../utils/logger');
const EmailJob = require('../models/EmailJob');
const nodemailer = require('nodemailer');

// ─── REUSABLE NODEMAILER INSTANCE ───────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── EMAIL QUEUE STATE ────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // exponential backoff
let isPolling = false;

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
 * Send a single OTP email via Nodemailer (Gmail).
 * Throws on failure (caller handles retry).
 */
const sendEmail = async (email, otpCode) => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP credentials are not configured.');
  }

  await transporter.sendMail({
    from: `"EARNETIX" <${env.SMTP_USER}>`,
    to: email,
    subject: 'EARNETIX — Your Verification Code',
    html: buildOtpHtml(otpCode),
  });
};

/**
 * Process a single email job from MongoDB.
 */
const processJob = async (job) => {
  const startMs = Date.now();
  
  job.status = 'processing';
  job.attempts += 1;
  await job.save();

  try {
    await sendEmail(job.email, job.otpCode);

    job.status = 'completed';
    await job.save();

    const deliveryMs = Date.now() - startMs;
    logger.info(`[EmailQueue] ✅ OTP delivered to ${job.email} | attempt=${job.attempts} | time=${deliveryMs}ms`);
  } catch (err) {
    const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    
    if (job.attempts < MAX_RETRIES) {
      const delay = RETRY_DELAYS_MS[job.attempts - 1];
      job.status = 'failed';
      job.lastError = errMsg;
      job.nextAttemptAt = new Date(Date.now() + delay);
      logger.warn(`[EmailQueue] ⚠️ Attempt ${job.attempts}/${MAX_RETRIES} failed for ${job.email}: ${errMsg}. Retrying soon.`);
    } else {
      job.status = 'failed';
      job.lastError = errMsg;
      job.nextAttemptAt = null; // Don't retry anymore
      logger.error(`[EmailQueue] ❌ All ${MAX_RETRIES} attempts failed for ${job.email}: ${errMsg}`);
    }
    await job.save();
  }
};

/**
 * Enqueue an OTP email job securely in MongoDB.
 * This is NON-BLOCKING — it saves to DB and returns immediately.
 */
const enqueue = async (email, otpCode) => {
  // Log OTP in development for easy testing
  if (env.NODE_ENV !== 'production') {
    logger.info(`======================================`);
    logger.info(`  DEV OTP for ${email}: ${otpCode}`);
    logger.info(`======================================`);
  }

  try {
    await EmailJob.create({ email, otpCode });
    logger.info(`[EmailQueue] Job safely enqueued in DB for ${email}`);
    
    // Trigger polling immediately if it's currently sleeping
    setImmediate(pollQueue);
  } catch (err) {
    logger.error(`[EmailQueue] Failed to enqueue job for ${email}: ${err.message}`);
  }
};

/**
 * Poll the database for pending or retryable jobs.
 */
const pollQueue = async () => {
  if (isPolling) return;
  isPolling = true;

  try {
    const job = await EmailJob.findOneAndUpdate(
      { 
        status: { $in: ['pending', 'failed'] },
        nextAttemptAt: { $lte: new Date() },
        $or: [{ attempts: { $lt: MAX_RETRIES } }, { status: 'pending' }]
      },
      { status: 'processing' }, // atomically mark processing so other workers don't grab it
      { sort: { nextAttemptAt: 1 }, new: true }
    );

    if (job) {
      await processJob(job);
      // Immediately try to process next job
      isPolling = false;
      setImmediate(pollQueue);
      return;
    }
  } catch (err) {
    logger.error(`[EmailQueue] Polling error: ${err.message}`);
  }

  isPolling = false;
};

/**
 * Initialize the queue — start background polling loop.
 */
const initialize = () => {
  if (!env.SMTP_USER) {
    logger.warn('[EmailQueue] ⚠️  SMTP_USER not set — OTP emails will fail.');
  } else {
    logger.info('[EmailQueue] ✅ MongoDB Email Queue initialized.');
  }
  
  // Clean up any stale processing jobs that might have stuck due to a server crash
  EmailJob.updateMany({ status: 'processing' }, { status: 'pending' }).catch(() => {});

  // Poll every 5 seconds as a fallback, though \`enqueue\` triggers it immediately too.
  setInterval(pollQueue, 5000);
};

module.exports = { enqueue, initialize };
