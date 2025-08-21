const mysql = require('mysql2/promise');
const config = require('./config');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        charset: config.db.charset,
        timezone: config.db.timezone,
        acquireTimeout: config.db.acquireTimeout,
        timeout: config.db.timeout,
        reconnect: config.db.reconnect,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: false,
        supportBigNumbers: true,
        bigNumberStrings: false
      });

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      this.isConnected = true;
      console.log('Database connected successfully');
      
      return this.pool;
    } catch (error) {
      console.error('Database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database disconnected');
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async execute(query, params = []) {
    try {
      const pool = this.getPool();
      const [rows, fields] = await pool.execute(query, params);
      return { rows, fields };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const pool = this.getPool();
      const [rows, fields] = await pool.query(sql, params);
      return { rows, fields };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const connection = await this.getPool().getConnection();
    await connection.beginTransaction();
    
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Helper method for formatted queries with proper escaping
  format(sql, values) {
    return mysql.format(sql, values);
  }

  // Method to check if database exists and create if not
  async initializeDatabase() {
    try {
      // Create connection without specifying database
      const tempPool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        charset: config.db.charset
      });

      // Check if database exists, create if not
      const [rows] = await tempPool.execute(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [config.db.database]
      );

      if (rows.length === 0) {
        await tempPool.execute(`CREATE DATABASE \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`Database '${config.db.database}' created successfully`);
      }

      await tempPool.end();
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  // Cleanup expired tokens and sessions
  async cleanupExpiredTokens() {
    try {
      const now = new Date();
      
      // Clean expired sessions
      await this.execute(
        'DELETE FROM sessions WHERE expires_at < ? OR revoked_at IS NOT NULL',
        [now]
      );

      // Clean expired email verification tokens
      await this.execute(
        'DELETE FROM email_verifications WHERE expires_at < ? OR consumed_at IS NOT NULL',
        [now]
      );

      // Clean expired password reset tokens
      await this.execute(
        'DELETE FROM password_resets WHERE expires_at < ? OR consumed_at IS NOT NULL',
        [now]
      );

      console.log('Expired tokens cleaned up successfully');
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;