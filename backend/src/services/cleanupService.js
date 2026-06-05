const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TEMP_DIR = path.join(process.cwd(), 'tmp', 'uploads');
const TEMP_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — files older than this are orphaned

/**
 * Cleanup Service
 * Runs periodic background tasks on the MASTER process only.
 * Workers never run cleanup to prevent duplicate work.
 */

/**
 * Delete temp upload files older than TEMP_MAX_AGE_MS.
 * Normally, temp files are cleaned up immediately after Cloudinary upload.
 * This catches any stragglers from crashed requests or unhandled errors.
 */
const cleanOrphanedTempFiles = () => {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;

    const now = Date.now();
    const files = fs.readdirSync(TEMP_DIR);
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > TEMP_MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (err) {
        // File may have been deleted by another process — ignore
        if (err.code !== 'ENOENT') {
          logger.error(`[Cleanup] Failed to stat/delete ${file}: ${err.message}`);
        }
      }
    }

    if (cleaned > 0) {
      logger.info(`[Cleanup] Removed ${cleaned} orphaned temp files from ${TEMP_DIR}`);
    }
  } catch (err) {
    logger.error(`[Cleanup] Temp file cleanup error: ${err.message}`);
  }
};

/**
 * Unblock users whose temporary block period has expired.
 * Runs periodically to ensure blocked users are freed automatically.
 */
const cleanExpiredTempBlocks = async () => {
  try {
    const User = require('../models/User');
    const result = await User.updateMany(
      { blockedUntil: { $lte: new Date() }, isBlocked: false },
      { $set: { blockedUntil: null } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[Cleanup] Cleared ${result.modifiedCount} expired temporary blocks`);
    }
  } catch (err) {
    logger.error(`[Cleanup] Expired block cleanup error: ${err.message}`);
  }
};

/**
 * Initialize all cleanup workers.
 * Call this on the MASTER process only (not per-worker).
 */
const startCleanupWorkers = () => {
  logger.info('[Cleanup] Starting background cleanup workers...');

  // Temp file cleanup — every 30 minutes
  setInterval(cleanOrphanedTempFiles, 30 * 60 * 1000);

  // Expired temp block cleanup — every 15 minutes
  setInterval(cleanExpiredTempBlocks, 15 * 60 * 1000);

  // Run temp file cleanup immediately on start (catch leftovers from crash)
  cleanOrphanedTempFiles();

  logger.info('[Cleanup] Background workers initialized: temp files (30min), expired blocks (15min)');
};

module.exports = { startCleanupWorkers, cleanOrphanedTempFiles, cleanExpiredTempBlocks };
