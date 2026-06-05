const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ─── MAGIC BYTE SIGNATURES ───────────────────────────────
// Maps file types to their magic byte sequences (hex).
// Used to verify that a file's actual content matches its claimed extension.
const MAGIC_BYTES = {
  jpg:  [Buffer.from([0xFF, 0xD8, 0xFF])],
  jpeg: [Buffer.from([0xFF, 0xD8, 0xFF])],
  png:  [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  gif:  [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  pdf:  [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  zip:  [Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.from([0x50, 0x4B, 0x05, 0x06])],
  rar:  [Buffer.from([0x52, 0x61, 0x72, 0x21])],
  '7z': [Buffer.from([0x37, 0x7A, 0xBC, 0xAF])],
  mp4:  [Buffer.from([0x00, 0x00, 0x00])], // ftyp box — partial match
  mp3:  [Buffer.from([0xFF, 0xFB]), Buffer.from([0xFF, 0xF3]), Buffer.from([0xFF, 0xF2]), Buffer.from([0x49, 0x44, 0x33])],
  wav:  [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  webp: [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF container
  bmp:  [Buffer.from([0x42, 0x4D])],
  tiff: [Buffer.from([0x49, 0x49, 0x2A, 0x00]), Buffer.from([0x4D, 0x4D, 0x00, 0x2A])],
  docx: [Buffer.from([0x50, 0x4B, 0x03, 0x04])], // ZIP-based format
  xlsx: [Buffer.from([0x50, 0x4B, 0x03, 0x04])], // ZIP-based format
  pptx: [Buffer.from([0x50, 0x4B, 0x03, 0x04])], // ZIP-based format
};

// Known executable magic bytes — ALWAYS reject these regardless of extension
const EXECUTABLE_SIGNATURES = [
  Buffer.from([0x4D, 0x5A]),             // MZ — PE/EXE/DLL
  Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF — Linux executables
  Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O — macOS executables
  Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O 32-bit
  Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O 64-bit
  Buffer.from([0xCE, 0xFA, 0xED, 0xFE]), // Mach-O reverse
  Buffer.from([0xCF, 0xFA, 0xED, 0xFE]), // Mach-O reverse 64
];

/**
 * Read the first N bytes of a file for magic byte inspection.
 * Uses a file descriptor to read only what's needed — no full file load.
 */
const readFileHead = async (filePath, bytes = 16) => {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await fd.read(buffer, 0, bytes, 0);
    return buffer.slice(0, bytesRead);
  } finally {
    await fd.close();
  }
};

/**
 * Validate a file's actual content against its claimed extension using magic bytes.
 * Returns { valid: true } or { valid: false, reason: string }.
 *
 * This is the core defense against extension spoofing attacks.
 */
const validateMagicBytes = async (filePath, claimedExtension) => {
  try {
    const head = await readFileHead(filePath, 16);
    if (head.length === 0) {
      return { valid: false, reason: 'File is empty' };
    }

    // ALWAYS check for executables first — reject regardless of claimed extension
    for (const sig of EXECUTABLE_SIGNATURES) {
      if (head.slice(0, sig.length).equals(sig)) {
        logger.warn(`[FileSecurity] Executable detected disguised as .${claimedExtension}: ${filePath}`);
        return { valid: false, reason: 'File contains executable content and is not allowed' };
      }
    }

    // If we have known signatures for this extension, verify the file matches
    const ext = claimedExtension.toLowerCase();
    const expectedSigs = MAGIC_BYTES[ext];

    if (expectedSigs) {
      const matches = expectedSigs.some(sig =>
        head.slice(0, sig.length).equals(sig)
      );
      if (!matches) {
        logger.warn(`[FileSecurity] Magic byte mismatch for .${ext}: ${filePath}`);
        return { valid: false, reason: `File content does not match .${ext} format` };
      }
    }

    // For extensions we don't have signatures for (txt, csv, odt, etc.), 
    // we still passed the executable check above — that's the critical guard.
    return { valid: true };
  } catch (error) {
    logger.error(`[FileSecurity] Magic byte validation error: ${error.message}`);
    // On read errors, fail closed (reject) for security
    return { valid: false, reason: 'Could not verify file integrity' };
  }
};

/**
 * Sanitize a filename — strips path traversal, special characters, Unicode control chars.
 * Preserves readability while ensuring safety.
 */
const sanitizeFilename = (filename) => {
  if (!filename) return 'unnamed_file';
  return filename
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Strip Unicode control characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')       // Replace special chars with underscore
    .replace(/\.{2,}/g, '.')                 // Remove consecutive dots (path traversal)
    .replace(/^\.+/, '')                     // Remove leading dots
    .replace(/_+/g, '_')                     // Collapse consecutive underscores
    .substring(0, 200);                      // Limit length
};

/**
 * Generate a cryptographically unique filename that prevents collisions and path traversal.
 * Format: {uuid}_{timestamp}.{ext}
 */
const generateSecureFilename = (originalName) => {
  const ext = originalName ? originalName.split('.').pop().toLowerCase() : 'bin';
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  return `${uuid}_${timestamp}.${ext}`;
};

/**
 * Full file safety check — orchestrates extension, magic byte, and size validation.
 * Returns { safe: true } or { safe: false, reason: string }.
 */
const isFileSafe = async (filePath, originalName, maxSizeBytes = null) => {
  if (!filePath || !originalName) {
    return { safe: false, reason: 'Missing file path or name' };
  }

  const ext = originalName.split('.').pop().toLowerCase();

  // Check blocked extensions (imported from uploadService constants)
  const { BLOCKED_EXTENSIONS } = require('./uploadService');
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { safe: false, reason: `File type .${ext} is blocked for security reasons` };
  }

  // Check file size if limit provided
  if (maxSizeBytes) {
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > maxSizeBytes) {
        const limitMB = Math.round(maxSizeBytes / (1024 * 1024));
        return { safe: false, reason: `File exceeds maximum size of ${limitMB}MB` };
      }
    } catch (err) {
      return { safe: false, reason: 'Could not read file size' };
    }
  }

  // Magic byte validation
  const magicResult = await validateMagicBytes(filePath, ext);
  if (!magicResult.valid) {
    return { safe: false, reason: magicResult.reason };
  }

  return { safe: true };
};

module.exports = {
  validateMagicBytes,
  sanitizeFilename,
  generateSecureFilename,
  isFileSafe,
  readFileHead,
};
