const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const argon2 = require('argon2');
const database = require('../config/database');
const config = require('../config/config');

class PasswordReset {
  constructor(data = {}) {
    this.token_id = data.token_id;
    this.user_id = data.user_id;
    this.token_hash = data.token_hash;
    this.created_at = data.created_at;
    this.expires_at = data.expires_at;
    this.consumed_at = data.consumed_at;
  }

  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async hashToken(token) {
    try {
      return await argon2.hash(token, config.security.argon2);
    } catch (error) {
      console.error('Token hashing error:', error);
      throw new Error('Token hashing failed');
    }
  }

  static async verifyToken(token, hash) {
    try {
      return await argon2.verify(hash, token);
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  static async create(userId) {
    try {
      const token = PasswordReset.generateToken();
      const tokenId = uuidv4();
      const tokenHash = await PasswordReset.hashToken(token);
      const expiresAt = new Date(Date.now() + config.tokenExpiration.passwordReset);

      // Remove any existing tokens for this user
      await database.execute(
        'DELETE FROM password_resets WHERE user_id = ?',
        [userId]
      );

      const reset = new PasswordReset({
        token_id: tokenId,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt
      });

      await reset.save();
      
      // Return both the reset object and the plain token
      return { reset, token };
    } catch (error) {
      console.error('PasswordReset creation error:', error);
      throw error;
    }
  }

  async save() {
    try {
      const { rows } = await database.execute(
        `INSERT INTO password_resets (token_id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
        [this.token_id, this.user_id, this.token_hash, this.expires_at]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('PasswordReset save error:', error);
      throw error;
    }
  }

  static async findByToken(token) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM password_resets WHERE consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)'
      );

      for (const row of rows) {
        if (await PasswordReset.verifyToken(token, row.token_hash)) {
          return new PasswordReset(row);
        }
      }

      return null;
    } catch (error) {
      console.error('PasswordReset findByToken error:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM password_resets WHERE user_id = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new PasswordReset(rows[0]);
    } catch (error) {
      console.error('PasswordReset findByUserId error:', error);
      throw error;
    }
  }

  async isValid() {
    if (this.consumed_at) {
      return false;
    }

    if (new Date() > new Date(this.expires_at)) {
      return false;
    }

    return true;
  }

  async consume() {
    try {
      this.consumed_at = new Date();

      const { rows } = await database.execute(
        'UPDATE password_resets SET consumed_at = CURRENT_TIMESTAMP(3) WHERE token_id = ?',
        [this.token_id]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('PasswordReset consume error:', error);
      throw error;
    }
  }

  static async cleanup() {
    try {
      const { rows } = await database.execute(
        'DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP(3) OR consumed_at IS NOT NULL'
      );

      console.log(`Cleaned up ${rows.affectedRows} expired/consumed password reset tokens`);
      return rows.affectedRows;
    } catch (error) {
      console.error('PasswordReset cleanup error:', error);
      throw error;
    }
  }

  // Check if user has pending reset request
  static async hasPendingReset(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT 1 FROM password_resets WHERE user_id = ? AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)',
        [userId]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('PasswordReset hasPendingReset error:', error);
      return false;
    }
  }

  // Revoke all tokens for a user (useful for security purposes)
  static async revokeAllByUserId(userId) {
    try {
      const { rows } = await database.execute(
        'UPDATE password_resets SET consumed_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND consumed_at IS NULL',
        [userId]
      );

      return rows.affectedRows;
    } catch (error) {
      console.error('PasswordReset revokeAllByUserId error:', error);
      throw error;
    }
  }

  // Rate limiting check - prevent too many password reset requests
  static async checkRateLimit(userId, timeWindow = 15 * 60 * 1000, maxAttempts = 3) {
    try {
      const cutoffTime = new Date(Date.now() - timeWindow);
      
      const { rows } = await database.execute(
        'SELECT COUNT(*) as count FROM password_resets WHERE user_id = ? AND created_at > ?',
        [userId, cutoffTime]
      );

      return rows[0].count < maxAttempts;
    } catch (error) {
      console.error('PasswordReset checkRateLimit error:', error);
      return false;
    }
  }

  // Get reset stats for admin
  static async getStats() {
    try {
      const { rows } = await database.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN consumed_at IS NOT NULL THEN 1 END) as consumed,
          COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP(3) AND consumed_at IS NULL THEN 1 END) as expired,
          COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP(3) AND consumed_at IS NULL THEN 1 END) as pending,
          COUNT(CASE WHEN created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 24 HOUR) THEN 1 END) as last_24h
        FROM password_resets
      `);

      return rows[0];
    } catch (error) {
      console.error('PasswordReset getStats error:', error);
      throw error;
    }
  }

  // Get recent reset attempts for monitoring
  static async getRecentAttempts(limit = 50) {
    try {
      const { rows } = await database.execute(`
        SELECT pr.*, u.email, u.display_name
        FROM password_resets pr
        JOIN users u ON pr.user_id = u.user_id
        ORDER BY pr.created_at DESC
        LIMIT ?
      `, [limit]);

      return rows;
    } catch (error) {
      console.error('PasswordReset getRecentAttempts error:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      token_id: this.token_id,
      user_id: this.user_id,
      created_at: this.created_at,
      expires_at: this.expires_at,
      consumed_at: this.consumed_at,
      is_valid: this.isValid()
    };
  }
}

module.exports = PasswordReset;