/**
 * HIPAA Compliance - Data Encryption Utilities
 * 
 * Provides encryption for Protected Health Information (PHI) at rest.
 * 
 * HIPAA Requirements Addressed:
 * - 164.312(a)(2)(iv) - Encryption and Decryption
 * - 164.312(e)(2)(ii) - Encryption (Addressable)
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get or generate encryption key from environment
 * In production, this should be stored in a secure key management system (KMS)
 */
function getEncryptionKey() {
  const key = process.env.HIPAA_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('HIPAA_ENCRYPTION_KEY environment variable is required for PHI encryption');
  }
  
  // Derive a proper 256-bit key from the provided key
  return crypto.scryptSync(key, 'hipaa-salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data
 * 
 * @param {string} plaintext - The data to encrypt
 * @returns {string} - Base64 encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext) {
  if (!plaintext) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + AuthTag + Encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt sensitive data
 * 
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, AuthTag, and Encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hash sensitive data (one-way, for comparison)
 * Useful for fields that need to be searched but not decrypted
 * 
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data
 */
export function hashData(data) {
  if (!data) return null;
  
  const salt = process.env.HIPAA_HASH_SALT || 'default-hipaa-salt';
  return crypto.pbkdf2Sync(data, salt, ITERATIONS, 64, 'sha512').toString('hex');
}

/**
 * Generate a secure random token
 * 
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex encoded random token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt PHI fields in an object
 * 
 * @param {Object} data - Object containing PHI fields
 * @param {string[]} fields - Field names to encrypt
 * @returns {Object} - Object with encrypted fields
 */
export function encryptPHIFields(data, fields) {
  if (!data) return data;
  
  const encrypted = { ...data };
  
  for (const field of fields) {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field].toString());
    }
  }
  
  return encrypted;
}

/**
 * Decrypt PHI fields in an object
 * 
 * @param {Object} data - Object containing encrypted PHI fields
 * @param {string[]} fields - Field names to decrypt
 * @returns {Object} - Object with decrypted fields
 */
export function decryptPHIFields(data, fields) {
  if (!data) return data;
  
  const decrypted = { ...data };
  
  for (const field of fields) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        // Field might not be encrypted (legacy data)
        // Leave as-is
      }
    }
  }
  
  return decrypted;
}

/**
 * Mask sensitive data for display (show only last 4 characters)
 * 
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} - Masked data
 */
export function maskSensitiveData(data, visibleChars = 4) {
  if (!data || data.length <= visibleChars) return '****';
  
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

/**
 * PHI fields that should be encrypted in the database
 */
export const PHI_FIELDS = {
  patient: ['aadharNumber', 'panNumber', 'medicalHistory', 'allergies'],
  staff: ['bankAccount', 'panNumber', 'aadharNumber'],
  prescription: ['diagnosis', 'notes'],
  bill: ['paymentDetails']
};

/**
 * Validate that encryption key is properly configured
 */
export function validateEncryptionSetup() {
  if (!process.env.HIPAA_ENCRYPTION_KEY) {
    return {
      valid: false,
      error: 'HIPAA_ENCRYPTION_KEY environment variable is not set'
    };
  }
  
  if (process.env.HIPAA_ENCRYPTION_KEY.length < 32) {
    return {
      valid: false,
      error: 'HIPAA_ENCRYPTION_KEY must be at least 32 characters long'
    };
  }
  
  // Test encryption/decryption
  try {
    const testData = 'HIPAA-encryption-test';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testData) {
      return {
        valid: false,
        error: 'Encryption/decryption test failed'
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Encryption test failed: ${error.message}`
    };
  }
}

export default {
  encrypt,
  decrypt,
  hashData,
  generateSecureToken,
  encryptPHIFields,
  decryptPHIFields,
  maskSensitiveData,
  PHI_FIELDS,
  validateEncryptionSetup
};
