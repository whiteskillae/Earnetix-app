const cloudinary = require('../config/cloudinary');
const { hashFileBuffer } = require('../utils/hashFile');
const logger = require('../utils/logger');

const BLOCKED_EXTENSIONS = ['exe', 'js', 'jsx', 'ts', 'tsx', 'apk', 'bat', 'cmd', 'sh', 'php', 'py', 'rb'];

/**
 * Validate file type and size.
 */
const validateFile = (file, allowedExtensions = [], maxFileSize = 5 * 1024 * 1024) => {
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed for security reasons`);
  }

  // If allowedExtensions is empty or contains '*', allow all non-blocked types
  if (allowedExtensions.length > 0 && !allowedExtensions.includes('*') && !allowedExtensions.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed. Allowed: ${allowedExtensions.join(', ')}`);
  }

  if (file.size > maxFileSize) {
    throw new Error(`File size exceeds limit of ${Math.round(maxFileSize / (1024 * 1024))}MB`);
  }

  return true;
};

/**
 * Upload file to Cloudinary and return URL + hash.
 */
const uploadToCloudinary = async (fileBuffer, folder = 'earnetix/submissions') => {
  const hash = hashFileBuffer(fileBuffer);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Changed to auto to support non-image files
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          return reject(new Error('File upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          hash,
        });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete file from Cloudinary.
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error(`Cloudinary deletion failed: ${error.message}`);
  }
};

module.exports = { validateFile, uploadToCloudinary, deleteFromCloudinary };
