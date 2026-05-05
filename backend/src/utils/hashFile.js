const crypto = require('crypto');

/**
 * Generate SHA-256 hash of a file buffer for duplicate detection.
 */
const hashFileBuffer = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate SHA-256 hash of a text string for duplicate detection.
 */
const hashText = (text) => {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
};

module.exports = { hashFileBuffer, hashText };
