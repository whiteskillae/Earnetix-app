const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
// In production, this should be a 32-byte hex string in .env (e.g. JWT_ACCESS_SECRET or a dedicated ENCRYPTION_KEY)
// For simplicity, we derive a 32-byte key from the JWT_ACCESS_SECRET
const SECRET_KEY = crypto.createHash('sha256').update(env.JWT_ACCESS_SECRET || 'fallback_secret_key_for_dev_only').digest();
const IV_LENGTH = 12; // 96-bit IV is standard for GCM

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} text - Plaintext to encrypt
 * @returns {string} - Base64 encoded 'iv:authTag:encryptedText' or null if input is empty
 */
const encrypt = (text) => {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
};

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param {string} encryptedData - Format 'iv:authTag:encryptedText'
 * @returns {string} - Plaintext or original string if not encrypted format
 */
const decrypt = (encryptedData) => {
  if (!encryptedData) return encryptedData;
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // If it's not in the encrypted format, return as is (useful during migration)
      return encryptedData;
    }
    
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

module.exports = { encrypt, decrypt };
