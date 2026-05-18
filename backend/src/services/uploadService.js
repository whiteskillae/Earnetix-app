const cloudinary = require('../config/cloudinary');
const { hashFileBuffer } = require('../utils/hashFile');
const logger = require('../utils/logger');

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

  if (file.size > effectiveMaxSize) {
    const limitMB = Math.round(effectiveMaxSize / (1024 * 1024));
    throw new Error(`File size too large. Please reduce the file size and upload again. Maximum allowed: ${limitMB}MB`);
  }

  // Basic MIME type sanity check (not foolproof, but catches obvious mismatches)
  if (file.mimetype) {
    const mimeExt = file.mimetype.split('/')[1]?.toLowerCase();
    // If claims to be image but extension isn't an image
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
 * Upload file buffer to Cloudinary via stream and return URL + hash.
 * Uses streaming to avoid holding entire buffer in memory during upload.
 */
const uploadToCloudinary = async (fileBuffer, folder = 'earnetix/submissions', originalNameOrType = 'auto') => {
  const hash = hashFileBuffer(fileBuffer);

  let resource_type = 'auto';
  if (originalNameOrType === 'raw' || originalNameOrType === 'image' || originalNameOrType === 'video') {
    resource_type = originalNameOrType;
  } else if (typeof originalNameOrType === 'string' && originalNameOrType.includes('.')) {
    const ext = originalNameOrType.split('.').pop().toLowerCase();
    // If it's a PDF, DOCX, ZIP, PPT, etc. (all documents/archives/etc.), upload as 'raw' to avoid Cloudinary PDF restriction 401s
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'svg', 'tiff'].includes(ext);
    const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(ext);
    if (isImage) {
      resource_type = 'image';
    } else if (isVideo) {
      resource_type = 'video';
    } else {
      resource_type = 'raw';
    }
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
      },
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
 * Delete file from Cloudinary by public_id. Handles all resource types.
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    // Try image first, then raw, then video
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

module.exports = {
  validateFile,
  sanitizeFilename,
  uploadToCloudinary,
  deleteFromCloudinary,
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
