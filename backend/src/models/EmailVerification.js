const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const argon2 = require('argon2');
const database = require('../config/database');
const config = require('../config/config');

class EmailVerification {
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
      const token = EmailVerification.generateToken();
      const tokenId = uuidv4();
      const tokenHash = await EmailVerification.hashToken(token);
      const expiresAt = new Date(Date.now() + config.tokenExpiration.emailVerification);

      // Remove any existing tokens for this user
      await database.execute(
        'DELETE FROM email_verifications WHERE user_id = ?',
        [userId]
      );

      const verification = new EmailVerification({
        token_id: tokenId,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt
      });

      await verification.save();
      
      // Return both the verification object and the plain token
      return { verification, token };
    } catch (error) {
      console.error('EmailVerification creation error:', error);
      throw error;
    }
  }

  async save() {
    try {
      const { rows } = await database.execute(
        `INSERT INTO email_verifications (token_id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
        [this.token_id, this.user_id, this.token_hash, this.expires_at]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('EmailVerification save error:', error);
      throw error;
    }
  }

  static async findByToken(token) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM email_verifications WHERE consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)'
      );

      for (const row of rows) {
        if (await EmailVerification.verifyToken(token, row.token_hash)) {
          return new EmailVerification(row);
        }
      }

      return null;
    } catch (error) {
      console.error('EmailVerification findByToken error:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM email_verifications WHERE user_id = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new EmailVerification(rows[0]);
    } catch (error) {
      console.error('EmailVerification findByUserId error:', error);
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
        'UPDATE email_verifications SET consumed_at = CURRENT_TIMESTAMP(3) WHERE token_id = ?',
        [this.token_id]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('EmailVerification consume error:', error);
      throw error;
    }
  }

  static async cleanup() {
    try {
      const { rows } = await database.execute(
        'DELETE FROM email_verifications WHERE expires_at < CURRENT_TIMESTAMP(3) OR consumed_at IS NOT NULL'
      );

      console.log(`Cleaned up ${rows.affectedRows} expired/consumed email verification tokens`);
      return rows.affectedRows;
    } catch (error) {
      console.error('EmailVerification cleanup error:', error);
      throw error;
    }
  }

  // Check if user has pending verification
  static async hasPendingVerification(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT 1 FROM email_verifications WHERE user_id = ? AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)',
        [userId]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('EmailVerification hasPendingVerification error:', error);
      return false;
    }
  }

  // Revoke all tokens for a user (useful when email changes)
  static async revokeAllByUserId(userId) {
    try {
      const { rows } = await database.execute(
        'UPDATE email_verifications SET consumed_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND consumed_at IS NULL',
        [userId]
      );

      return rows.affectedRows;
    } catch (error) {
      console.error('EmailVerification revokeAllByUserId error:', error);
      throw error;
    }
  }

  // Get verification stats for admin
  static async getStats() {
    try {
      const { rows } = await database.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN consumed_at IS NOT NULL THEN 1 END) as consumed,
          COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP(3) AND consumed_at IS NULL THEN 1 END) as expired,
          COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP(3) AND consumed_at IS NULL THEN 1 END) as pending
        FROM email_verifications
      `);

      return rows[0];
    } catch (error) {
      console.error('EmailVerification getStats error:', error);
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

module.exports = EmailVerification;