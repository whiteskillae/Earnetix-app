const cloudinary = require('../config/cloudinary');
const { hashFileBuffer } = require('../utils/hashFile');
const logger = require('../utils/logger');
const fs = require('fs');
const crypto = require('crypto');

// ─── BLOCKED EXTENSIONS (SECURITY) ─────────────────────
const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'msi', 'com', 'scr', 'pif',
  'vbs', 'vbe', 'wsf', 'wsh', 'cpl', 'inf', 'reg', 'rgs',
  'php', 'py', 'rb', 'pl', 'cgi',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'apk', 'ipa', 'deb', 'rpm',
  'dll', 'sys', 'drv', 'so', 'dylib',
  'htaccess', 'htpasswd',
  'jar', 'class', 'war',
];

// ─── ALLOWED CATEGORIES ────────────────────────────────
const ALLOWED_IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'svg', 'tiff'];
const ALLOWED_DOCS = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'ppt', 'pptx', 'odt', 'ods'];
const ALLOWED_ARCHIVES = ['zip', 'rar', '7z', 'tar', 'gz'];
const ALLOWED_MEDIA = ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'flac'];

const ALL_ALLOWED = [...ALLOWED_IMAGES, ...ALLOWED_DOCS, ...ALLOWED_ARCHIVES, ...ALLOWED_MEDIA];

// ─── SIZE LIMITS ───────────────────────────────────────
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

/**
 * Validate file type and size with strict security rules.
 * Works with both buffer-based files (legacy) and disk-based files (new).
 */
const validateFile = (file, allowedExtensions = [], maxFileSize = null) => {
  if (!file || !file.originalname) {
    throw new Error('Invalid file: no filename provided');
  }

  const ext = file.originalname.split('.').pop().toLowerCase();

  // ALWAYS block dangerous extensions regardless of allowedExtensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed for security reasons`);
  }

  // Determine effective size limit
  const isImage = ALLOWED_IMAGES.includes(ext);
  const effectiveMaxSize = maxFileSize || (isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE);

  // If allowedExtensions is empty or contains '*', allow all non-blocked types
  if (allowedExtensions.length > 0 && !allowedExtensions.includes('*') && !allowedExtensions.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Use file.size (works for both multer memory and disk storage)
  if (file.size > effectiveMaxSize) {
    const limitMB = Math.round(effectiveMaxSize / (1024 * 1024));
    throw new Error(`File size too large. Please reduce the file size and upload again. Maximum allowed: ${limitMB}MB`);
  }

  // Basic MIME type sanity check (not foolproof, but catches obvious mismatches)
  if (file.mimetype) {
    if (file.mimetype.startsWith('application/x-executable') ||
        file.mimetype.startsWith('application/x-msdownload') ||
        file.mimetype.startsWith('application/x-msdos-program')) {
      throw new Error('Executable files are not allowed');
    }
  }

  return true;
};

/**
 * Sanitize a filename — strip path traversal and special characters.
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // Remove consecutive dots (path traversal)
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 200); // Limit length
};

/**
 * Determine Cloudinary resource_type based on file extension.
 */
const getResourceType = (originalName) => {
  if (!originalName || !originalName.includes('.')) return 'auto';
  const ext = originalName.split('.').pop().toLowerCase();
  if (ALLOWED_IMAGES.includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'raw';
};

/**
 * Compute SHA-256 hash from a file on disk without loading it into memory.
 * Uses streaming to keep memory usage near zero.
 */
const hashFileFromDisk = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Upload a file from DISK to Cloudinary using streaming.
 * Never loads the entire file into RAM — pipes directly from disk to the HTTP stream.
 *
 * Returns: { url, publicId, hash, bytes, format, resourceType }
 */
const uploadToCloudinaryFromDisk = (filePath, folder = 'earnetix/submissions', originalName = 'file') => {
  return new Promise(async (resolve, reject) => {
    let hash;
    try {
      hash = await hashFileFromDisk(filePath);
    } catch (err) {
      return reject(new Error(`Failed to hash file: ${err.message}`));
    }

    const resource_type = getResourceType(originalName);

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          return reject(new Error('File upload failed. Please try again.'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          hash,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );

    // Stream from disk to Cloudinary — zero RAM footprint
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      logger.error(`File read stream error: ${err.message}`);
      reject(new Error('Failed to read file for upload'));
    });
    fileStream.pipe(uploadStream);
  });
};

/**
 * Upload file buffer to Cloudinary via stream and return URL + hash.
 * BACKWARD-COMPATIBLE: This is the original API used by existing controllers.
 * It now delegates to the disk-based uploader when a file path is available.
 */
const uploadToCloudinary = async (bufferOrPath, folder = 'earnetix/submissions', originalNameOrType = 'auto') => {
  // If a file path (string) is passed, use the disk-based uploader
  if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
    return uploadToCloudinaryFromDisk(bufferOrPath, folder, originalNameOrType);
  }

  // Legacy buffer-based path (for any callers still passing buffers)
  const fileBuffer = bufferOrPath;
  const hash = hashFileBuffer(fileBuffer);

  let resource_type = 'auto';
  if (originalNameOrType === 'raw' || originalNameOrType === 'image' || originalNameOrType === 'video') {
    resource_type = originalNameOrType;
  } else if (typeof originalNameOrType === 'string' && originalNameOrType.includes('.')) {
    resource_type = getResourceType(originalNameOrType);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          return reject(new Error('File upload failed. Please try again.'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          hash,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Upload multiple files to Cloudinary in controlled parallel batches.
 * Uses Promise.allSettled with concurrency limit to prevent overwhelming Cloudinary.
 *
 * @param {Array} files — multer file objects (with .path for disk, or .buffer for memory)
 * @param {string} folder — Cloudinary folder path
 * @param {number} concurrency — max parallel uploads (default: 3)
 * @returns {Array} — array of { success: true, result } or { success: false, error, file }
 */
const uploadMultipleToCloudinary = async (files, folder = 'earnetix/submissions', concurrency = 3) => {
  const results = [];

  // Process in batches of `concurrency`
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(file => {
        const source = file.path || file.buffer;
        return uploadToCloudinary(source, folder, file.originalname);
      })
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push({ success: true, result: result.value, file: batch[j] });
      } else {
        logger.error(`Batch upload failed for ${batch[j]?.originalname}: ${result.reason?.message}`);
        results.push({ success: false, error: result.reason?.message, file: batch[j] });
      }
    }
  }

  return results;
};

/**
 * Delete file from Cloudinary by public_id.
 * IMPROVED: Accepts optional resourceType to avoid trial-and-error deletion.
 * Falls back to sequential type-probing if resourceType is not provided (backward compat).
 */
const deleteFromCloudinary = async (publicId, resourceType = null) => {
  if (!publicId) return;
  try {
    if (resourceType) {
      // Direct deletion — O(1) API call
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      if (result.result === 'ok' || result.result === 'not found') {
        logger.info(`Deleted from Cloudinary: ${publicId} (${resourceType})`);
        return;
      }
    }

    // Fallback: try all resource types (backward compat for old submissions without resourceType)
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result !== 'ok') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    if (result.result !== 'ok') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }
    logger.info(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error(`Cloudinary deletion failed for ${publicId}: ${error.message}`);
  }
};

/**
 * Rollback uploaded files from Cloudinary.
 * Used when a DB save fails after successful upload — prevents orphaned files.
 *
 * @param {Array} uploadResults — array of { publicId, resourceType } objects
 */
const rollbackUploads = async (uploadResults) => {
  if (!uploadResults || uploadResults.length === 0) return;

  const cleanupPromises = uploadResults.map(result => {
    if (result.publicId) {
      return deleteFromCloudinary(result.publicId, result.resourceType).catch(err => {
        logger.error(`[Rollback] Failed to cleanup ${result.publicId}: ${err.message}`);
      });
    }
    return Promise.resolve();
  });

  await Promise.allSettled(cleanupPromises);
  logger.info(`[Rollback] Cleaned up ${uploadResults.length} orphaned uploads`);
};

module.exports = {
  validateFile,
  sanitizeFilename,
  uploadToCloudinary,
  uploadToCloudinaryFromDisk,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  rollbackUploads,
  hashFileFromDisk,
  getResourceType,
  // Export constants for frontend alignment
  ALLOWED_IMAGES,
  ALLOWED_DOCS,
  ALLOWED_ARCHIVES,
  ALLOWED_MEDIA,
  ALL_ALLOWED,
  BLOCKED_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_FILE_SIZE,
};
