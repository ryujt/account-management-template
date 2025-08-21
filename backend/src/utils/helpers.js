const crypto = require('crypto');

/**
 * Utility functions for common operations
 */
class Helpers {
  /**
   * Generate a secure random string
   * @param {number} length - Length of the string to generate
   * @param {string} charset - Character set to use (default: alphanumeric)
   * @returns {string} Random string
   */
  static generateRandomString(length = 32, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    let result = '';
    const charactersLength = charset.length;
    
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
  }

  /**
   * Generate a secure random token using crypto
   * @param {number} bytes - Number of bytes for the token
   * @returns {string} Hex encoded token
   */
  static generateSecureToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hash a string using SHA-256
   * @param {string} text - Text to hash
   * @returns {string} Hex encoded hash
   */
  static hashSHA256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID v4
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} Validation result with isValid boolean and reasons array
   */
  static validatePassword(password) {
    const result = {
      isValid: true,
      reasons: []
    };

    if (!password || password.length < 8) {
      result.isValid = false;
      result.reasons.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      result.isValid = false;
      result.reasons.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      result.isValid = false;
      result.reasons.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      result.isValid = false;
      result.reasons.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      result.isValid = false;
      result.reasons.push('Password must contain at least one special character (@$!%*?&)');
    }

    return result;
  }

  /**
   * Sanitize string for database storage
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' '); // Remove extra whitespace
  }

  /**
   * Format date to ISO string with timezone
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDate(date = new Date()) {
    return date.toISOString();
  }

  /**
   * Get time difference in human readable format
   * @param {Date} date - Date to compare with now
   * @returns {string} Human readable time difference
   */
  static getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} days ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} months ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} years ago`;
  }

  /**
   * Parse pagination parameters
   * @param {object} query - Query parameters
   * @returns {object} Parsed pagination parameters
   */
  static parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Create pagination info
   * @param {number} total - Total number of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {object} Pagination information
   */
  static createPaginationInfo(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  }

  /**
   * Mask sensitive data in strings
   * @param {string} str - String to mask
   * @param {number} visibleChars - Number of characters to show at start and end
   * @returns {string} Masked string
   */
  static maskSensitiveData(str, visibleChars = 2) {
    if (!str || str.length <= visibleChars * 2) {
      return '*'.repeat(str?.length || 0);
    }

    const start = str.substring(0, visibleChars);
    const end = str.substring(str.length - visibleChars);
    const middle = '*'.repeat(str.length - visibleChars * 2);

    return `${start}${middle}${end}`;
  }

  /**
   * Deep merge objects
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @returns {object} Merged object
   */
  static deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Remove undefined and null values from object
   * @param {object} obj - Object to clean
   * @returns {object} Cleaned object
   */
  static removeEmptyValues(obj) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleanedValue = this.removeEmptyValues(value);
          if (Object.keys(cleanedValue).length > 0) {
            cleaned[key] = cleanedValue;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise} Promise that resolves with function result
   */
  static async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, i);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Truncate string to specified length
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to add when truncated
   * @returns {string} Truncated string
   */
  static truncateString(str, length, suffix = '...') {
    if (!str || str.length <= length) {
      return str;
    }

    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Convert string to slug
   * @param {string} str - String to convert
   * @returns {string} Slug
   */
  static slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Check if object is empty
   * @param {object} obj - Object to check
   * @returns {boolean} True if empty
   */
  static isEmpty(obj) {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  /**
   * Convert bytes to human readable format
   * @param {number} bytes - Bytes to convert
   * @param {number} decimals - Number of decimal places
   * @returns {string} Human readable size
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = Helpers;