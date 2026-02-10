/**
 * HIPAA Compliance - Password Policy Utilities
 * 
 * Implements password complexity requirements and security best practices.
 * 
 * HIPAA Requirements Addressed:
 * - 164.308(a)(5)(ii)(D) - Password Management
 * - 164.312(d) - Person or Entity Authentication
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Password policy configuration
const PASSWORD_POLICY = {
  minLength: 12,                    // HIPAA recommends at least 8, we use 12
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  preventCommonPasswords: true,
  preventUserInfo: true,            // Prevent password containing username/email
  passwordHistoryCount: 5,          // Remember last 5 passwords
  maxAgeInDays: 90,                 // Password expires after 90 days
  minAgeInDays: 1,                  // Minimum time before password can be changed
  lockoutThreshold: 5,              // Lock account after 5 failed attempts
  lockoutDurationMinutes: 30        // Lock duration
};

// Common passwords to block
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'master', 'dragon', 'letmein', 'login', 'admin', 'welcome',
  'password1', 'passw0rd', 'iloveyou', 'sunshine', 'princess', 'football',
  'baseball', 'shadow', 'superman', 'michael', 'jennifer', 'hunter',
  'docclinic', 'clinic123', 'doctor123', 'health123'
];

/**
 * Validate password against HIPAA requirements
 * 
 * @param {string} password - Password to validate
 * @param {Object} userInfo - User info (email, name) to prevent password containing user info
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validatePassword(password, userInfo = {}) {
  const errors = [];
  
  if (!password) {
    return { valid: false, errors: ['Password is required'] };
  }
  
  // Length check
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }
  
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password cannot exceed ${PASSWORD_POLICY.maxLength} characters`);
  }
  
  // Uppercase check
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase check
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Numbers check
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special characters check
  if (PASSWORD_POLICY.requireSpecialChars) {
    const specialChars = password.match(/[!@#$%^&*(),.?":{}|<>[\]\\\/~`_+=;'-]/g);
    if (!specialChars || specialChars.length < PASSWORD_POLICY.minSpecialChars) {
      errors.push(`Password must contain at least ${PASSWORD_POLICY.minSpecialChars} special character(s)`);
    }
  }
  
  // Common password check
  if (PASSWORD_POLICY.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
      errors.push('Password is too common. Please choose a more unique password');
    }
  }
  
  // User info check
  if (PASSWORD_POLICY.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@');
      if (emailParts.some(part => part.length > 3 && lowerPassword.includes(part))) {
        errors.push('Password cannot contain parts of your email address');
      }
    }
    
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(/\s+/);
      if (nameParts.some(part => part.length > 3 && lowerPassword.includes(part))) {
        errors.push('Password cannot contain parts of your name');
      }
    }
  }
  
  // Check for repeated characters (e.g., "aaaa")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password cannot contain more than 3 consecutive identical characters');
  }
  
  // Check for sequential characters (e.g., "1234" or "abcd")
  if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    errors.push('Password cannot contain sequential characters (e.g., 1234 or abcd)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Hash password with bcrypt
 * 
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  const saltRounds = 12; // Higher rounds = more secure but slower
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * 
 * @param {string} password - Plain text password
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Check if password was used before (password history)
 * 
 * @param {string} password - New password to check
 * @param {string[]} passwordHistory - Array of previous password hashes
 * @returns {Promise<boolean>} - True if password was used before
 */
export async function wasPasswordUsedBefore(password, passwordHistory = []) {
  for (const oldHash of passwordHistory) {
    if (await verifyPassword(password, oldHash)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a secure random password
 * 
 * @param {number} length - Password length
 * @returns {string} - Random password meeting all requirements
 */
export function generateSecurePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each required type
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

/**
 * Check if password needs to be changed (expired)
 * 
 * @param {Date} lastPasswordChange - Date of last password change
 * @returns {boolean} - True if password is expired
 */
export function isPasswordExpired(lastPasswordChange) {
  if (!lastPasswordChange) return true;
  
  const now = new Date();
  const diffDays = Math.floor((now - new Date(lastPasswordChange)) / (1000 * 60 * 60 * 24));
  
  return diffDays >= PASSWORD_POLICY.maxAgeInDays;
}

/**
 * Check if password can be changed (minimum age)
 * 
 * @param {Date} lastPasswordChange - Date of last password change
 * @returns {boolean} - True if password can be changed
 */
export function canChangePassword(lastPasswordChange) {
  if (!lastPasswordChange) return true;
  
  const now = new Date();
  const diffDays = Math.floor((now - new Date(lastPasswordChange)) / (1000 * 60 * 60 * 24));
  
  return diffDays >= PASSWORD_POLICY.minAgeInDays;
}

/**
 * Get password strength score (0-100)
 * 
 * @param {string} password - Password to score
 * @returns {Object} - { score: number, label: string }
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'None' };
  
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 4, 40);
  
  // Character variety bonuses
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  
  // Variety bonus
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 15);
  
  // Penalize patterns
  if (/(.)\1{2,}/.test(password)) score -= 10;
  if (/^[a-z]+$/i.test(password)) score -= 10;
  if (/^\d+$/.test(password)) score -= 20;
  
  score = Math.max(0, Math.min(100, score));
  
  let label;
  if (score < 30) label = 'Weak';
  else if (score < 50) label = 'Fair';
  else if (score < 70) label = 'Good';
  else if (score < 90) label = 'Strong';
  else label = 'Excellent';
  
  return { score, label };
}

/**
 * Get password policy description for UI
 */
export function getPasswordRequirements() {
  return {
    minLength: PASSWORD_POLICY.minLength,
    requirements: [
      `At least ${PASSWORD_POLICY.minLength} characters`,
      'At least one uppercase letter (A-Z)',
      'At least one lowercase letter (a-z)',
      'At least one number (0-9)',
      'At least one special character (!@#$%^&* etc.)',
      'Cannot contain your name or email',
      'Cannot be a commonly used password',
      'Cannot have more than 3 identical characters in a row'
    ],
    expirationDays: PASSWORD_POLICY.maxAgeInDays
  };
}

export default {
  validatePassword,
  hashPassword,
  verifyPassword,
  wasPasswordUsedBefore,
  generateSecurePassword,
  isPasswordExpired,
  canChangePassword,
  getPasswordStrength,
  getPasswordRequirements,
  PASSWORD_POLICY
};
