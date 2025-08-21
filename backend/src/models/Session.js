const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const argon2 = require('argon2');
const database = require('../config/database');
const config = require('../config/config');

class Session {
  constructor(data = {}) {
    this.session_id = data.session_id;
    this.user_id = data.user_id;
    this.refresh_token_hash = data.refresh_token_hash;
    this.ip = data.ip;
    this.ua = data.ua;
    this.created_at = data.created_at;
    this.expires_at = data.expires_at;
    this.revoked_at = data.revoked_at;
  }

  static generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  static async hashRefreshToken(token) {
    try {
      return await argon2.hash(token, config.security.argon2);
    } catch (error) {
      console.error('Refresh token hashing error:', error);
      throw new Error('Token hashing failed');
    }
  }

  static async verifyRefreshToken(token, hash) {
    try {
      return await argon2.verify(hash, token);
    } catch (error) {
      console.error('Refresh token verification error:', error);
      return false;
    }
  }

  static async create(userId, refreshToken, clientInfo = {}) {
    try {
      const sessionId = uuidv4();
      const tokenHash = await Session.hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + config.tokenExpiration.refreshToken);

      const session = new Session({
        session_id: sessionId,
        user_id: userId,
        refresh_token_hash: tokenHash,
        ip: clientInfo.ip,
        ua: clientInfo.userAgent,
        expires_at: expiresAt
      });

      await session.save();
      return session;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }

  async save() {
    try {
      const { rows } = await database.execute(
        `INSERT INTO sessions (session_id, user_id, refresh_token_hash, ip, ua, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         refresh_token_hash = VALUES(refresh_token_hash),
         expires_at = VALUES(expires_at),
         revoked_at = NULL`,
        [this.session_id, this.user_id, this.refresh_token_hash, 
         this.ip, this.ua, this.expires_at]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Session save error:', error);
      throw error;
    }
  }

  static async findById(sessionId) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM sessions WHERE session_id = ? AND revoked_at IS NULL',
        [sessionId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Session(rows[0]);
    } catch (error) {
      console.error('Session findById error:', error);
      throw error;
    }
  }

  static async findByToken(refreshToken) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM sessions WHERE revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)'
      );

      for (const row of rows) {
        if (await Session.verifyRefreshToken(refreshToken, row.refresh_token_hash)) {
          return new Session(row);
        }
      }

      return null;
    } catch (error) {
      console.error('Session findByToken error:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
        [userId]
      );

      return rows.map(row => new Session(row));
    } catch (error) {
      console.error('Session findByUserId error:', error);
      throw error;
    }
  }

  async isValid() {
    if (this.revoked_at) {
      return false;
    }

    if (new Date() > new Date(this.expires_at)) {
      return false;
    }

    return true;
  }

  async revoke() {
    try {
      this.revoked_at = new Date();
      
      const { rows } = await database.execute(
        'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE session_id = ?',
        [this.session_id]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Session revoke error:', error);
      throw error;
    }
  }

  async extend(duration = null) {
    try {
      const extensionTime = duration || config.tokenExpiration.refreshToken;
      this.expires_at = new Date(Date.now() + extensionTime);

      const { rows } = await database.execute(
        'UPDATE sessions SET expires_at = ? WHERE session_id = ?',
        [this.expires_at, this.session_id]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Session extend error:', error);
      throw error;
    }
  }

  async updateToken(newRefreshToken) {
    try {
      this.refresh_token_hash = await Session.hashRefreshToken(newRefreshToken);

      const { rows } = await database.execute(
        'UPDATE sessions SET refresh_token_hash = ? WHERE session_id = ?',
        [this.refresh_token_hash, this.session_id]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Session updateToken error:', error);
      throw error;
    }
  }

  // Revoke all sessions for a user (useful for logout all devices)
  static async revokeAllByUserId(userId) {
    try {
      const { rows } = await database.execute(
        'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL',
        [userId]
      );

      return rows.affectedRows;
    } catch (error) {
      console.error('Session revokeAllByUserId error:', error);
      throw error;
    }
  }

  // Revoke all sessions except current one
  static async revokeOtherSessions(userId, currentSessionId) {
    try {
      const { rows } = await database.execute(
        'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND session_id != ? AND revoked_at IS NULL',
        [userId, currentSessionId]
      );

      return rows.affectedRows;
    } catch (error) {
      console.error('Session revokeOtherSessions error:', error);
      throw error;
    }
  }

  // Cleanup expired and revoked sessions
  static async cleanup() {
    try {
      const { rows } = await database.execute(
        'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP(3) OR revoked_at IS NOT NULL'
      );

      console.log(`Cleaned up ${rows.affectedRows} expired/revoked sessions`);
      return rows.affectedRows;
    } catch (error) {
      console.error('Session cleanup error:', error);
      throw error;
    }
  }

  // Get active sessions count for a user
  static async getActiveSessionsCount(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)',
        [userId]
      );

      return rows[0].count;
    } catch (error) {
      console.error('Session getActiveSessionsCount error:', error);
      throw error;
    }
  }

  // Get session info for admin/user management
  static async getSessionInfo(userId) {
    try {
      const { rows } = await database.execute(
        `SELECT session_id, ip, ua, created_at, expires_at, 
                CASE WHEN expires_at > CURRENT_TIMESTAMP(3) THEN 'active' ELSE 'expired' END as status
         FROM sessions 
         WHERE user_id = ? AND revoked_at IS NULL 
         ORDER BY created_at DESC`,
        [userId]
      );

      return rows;
    } catch (error) {
      console.error('Session getSessionInfo error:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      session_id: this.session_id,
      user_id: this.user_id,
      ip: this.ip,
      ua: this.ua,
      created_at: this.created_at,
      expires_at: this.expires_at,
      revoked_at: this.revoked_at,
      is_valid: this.isValid()
    };
  }
}

module.exports = Session;