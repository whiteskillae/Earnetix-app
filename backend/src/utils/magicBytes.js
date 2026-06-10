const fs = require('fs').promises;

// Minimal magic bytes for common allowed formats
const MAGIC_BYTES = {
  // Images
  jpg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
  png: ['89504e47'],
  gif: ['47494638'],
  webp: ['52494646'], // Also requires 'WEBP' at offset 8, but RIFF is a start
  // Docs
  pdf: ['25504446'],
  zip: ['504b0304'], // DOCX, XLSX are zip files
};

/**
 * Validates the file against its extension using magic bytes.
 * Reads the first 4 bytes of the file.
 * Returns true if valid or unknown (we only fail explicitly known mismatched ones),
 * or throws an Error if it's definitely a mismatch for a sensitive type.
 */
const validateMagicBytes = async (filePath, originalName) => {
  const ext = originalName.split('.').pop().toLowerCase();
  
  // If it's a type we track, we verify
  let validSignatures = [];
  if (MAGIC_BYTES[ext]) {
    validSignatures = MAGIC_BYTES[ext];
  } else if (['docx', 'xlsx', 'pptx'].includes(ext)) {
    validSignatures = MAGIC_BYTES.zip; // Modern office docs are ZIP archives
  } else if (['jpeg'].includes(ext)) {
    validSignatures = MAGIC_BYTES.jpg;
  } else {
    // If we don't have a signature for it, we let Cloudinary's strict validation handle it
    return true;
  }

  try {
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    await fileHandle.read(buffer, 0, 4, 0);
    await fileHandle.close();

    const hex = buffer.toString('hex');
    
    // Check if the file's hex signature matches any of the known signatures
    const isValid = validSignatures.some(sig => hex.startsWith(sig));
    
    if (!isValid) {
      throw new Error(`File spoofing detected. The file signature does not match a real .${ext} file.`);
    }

    return true;
  } catch (error) {
    if (error.message.includes('spoofing')) throw error;
    // Fallback if we can't read the file for some reason
    return true; 
  }
};

module.exports = { validateMagicBytes };
