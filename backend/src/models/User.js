const argon2 = require('argon2');
const database = require('../config/database');
const config = require('../config/config');

class User {
  constructor(data = {}) {
    this.user_id = data.user_id;
    this.email = data.email;
    this.email_verified = data.email_verified || false;
    this.password_hash = data.password_hash;
    this.display_name = data.display_name;
    this.status = data.status || 'active';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async hashPassword(password) {
    try {
      return await argon2.hash(password, config.security.argon2);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Password hashing failed');
    }
  }

  static async verifyPassword(password, hash) {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  async save() {
    try {
      if (this.user_id) {
        // Update existing user
        const { rows } = await database.execute(
          `UPDATE users SET 
           email = ?, email_verified = ?, password_hash = ?, 
           display_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP(3)
           WHERE user_id = ?`,
          [this.email, this.email_verified, this.password_hash, 
           this.display_name, this.status, this.user_id]
        );
        return rows.affectedRows > 0;
      } else {
        // Create new user
        const { rows } = await database.execute(
          `INSERT INTO users (email, email_verified, password_hash, display_name, status)
           VALUES (?, ?, ?, ?, ?)`,
          [this.email, this.email_verified, this.password_hash, this.display_name, this.status]
        );
        this.user_id = rows.insertId;
        return true;
      }
    } catch (error) {
      console.error('User save error:', error);
      throw error;
    }
  }

  static async findById(userId) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM users WHERE user_id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return new User(rows[0]);
    } catch (error) {
      console.error('User findById error:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return new User(rows[0]);
    } catch (error) {
      console.error('User findByEmail error:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        userData.password_hash = await User.hashPassword(userData.password);
        delete userData.password;
      }

      const user = new User(userData);
      await user.save();
      return user;
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  }

  async getRoles() {
    try {
      const { rows } = await database.execute(
        `SELECT r.role_name, r.description, ur.assigned_by, ur.created_at
         FROM user_roles ur
         JOIN roles r ON ur.role_name = r.role_name
         WHERE ur.user_id = ?`,
        [this.user_id]
      );
      
      return rows;
    } catch (error) {
      console.error('User getRoles error:', error);
      throw error;
    }
  }

  async hasRole(roleName) {
    try {
      const { rows } = await database.execute(
        'SELECT 1 FROM user_roles WHERE user_id = ? AND role_name = ?',
        [this.user_id, roleName]
      );
      
      return rows.length > 0;
    } catch (error) {
      console.error('User hasRole error:', error);
      return false;
    }
  }

  async assignRole(roleName, assignedBy = null) {
    try {
      const { rows } = await database.execute(
        `INSERT INTO user_roles (user_id, role_name, assigned_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), created_at = CURRENT_TIMESTAMP(3)`,
        [this.user_id, roleName, assignedBy]
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User assignRole error:', error);
      throw error;
    }
  }

  async removeRole(roleName) {
    try {
      const { rows } = await database.execute(
        'DELETE FROM user_roles WHERE user_id = ? AND role_name = ?',
        [this.user_id, roleName]
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User removeRole error:', error);
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const allowedFields = ['email', 'display_name'];
      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(profileData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          values.push(value);
          this[key] = value;
        }
      }

      if (updates.length === 0) {
        return false;
      }

      values.push(this.user_id);
      
      const { rows } = await database.execute(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE user_id = ?`,
        values
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User updateProfile error:', error);
      throw error;
    }
  }

  async updatePassword(newPassword) {
    try {
      this.password_hash = await User.hashPassword(newPassword);
      
      const { rows } = await database.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE user_id = ?',
        [this.password_hash, this.user_id]
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User updatePassword error:', error);
      throw error;
    }
  }

  async verifyEmail() {
    try {
      this.email_verified = true;
      
      const { rows } = await database.execute(
        'UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP(3) WHERE user_id = ?',
        [this.user_id]
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User verifyEmail error:', error);
      throw error;
    }
  }

  async disable() {
    try {
      this.status = 'disabled';
      
      const { rows } = await database.execute(
        'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE user_id = ?',
        ['disabled', this.user_id]
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User disable error:', error);
      throw error;
    }
  }

  async enable() {
    try {
      this.status = 'active';
      
      const { rows } = await database.execute(
        'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE user_id = ?',
        ['active', this.user_id]
      );
      
      return rows.affectedRows > 0;
    } catch (error) {
      console.error('User enable error:', error);
      throw error;
    }
  }

  // Admin methods
  static async findAll(options = {}) {
    try {
      const {
        query = '',
        role = '',
        status = '',
        limit = 20,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let sql = `
        SELECT DISTINCT u.*, 
               GROUP_CONCAT(ur.role_name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      `;
      
      const conditions = [];
      const params = [];

      if (query) {
        conditions.push('(u.email LIKE ? OR u.display_name LIKE ?)');
        params.push(`%${query}%`, `%${query}%`);
      }

      if (status) {
        conditions.push('u.status = ?');
        params.push(status);
      }

      if (role) {
        conditions.push('ur.role_name = ?');
        params.push(role);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY u.user_id`;
      sql += ` ORDER BY u.${sortBy} ${sortOrder}`;
      sql += ` LIMIT ? OFFSET ?`;
      
      params.push(limit, offset);

      const { rows } = await database.execute(sql, params);
      
      return rows.map(row => {
        const user = new User(row);
        user.roles = row.roles ? row.roles.split(',') : [];
        return user;
      });
    } catch (error) {
      console.error('User findAll error:', error);
      throw error;
    }
  }

  static async count(options = {}) {
    try {
      const { query = '', role = '', status = '' } = options;

      let sql = 'SELECT COUNT(DISTINCT u.user_id) as count FROM users u';
      
      if (role) {
        sql += ' LEFT JOIN user_roles ur ON u.user_id = ur.user_id';
      }

      const conditions = [];
      const params = [];

      if (query) {
        conditions.push('(u.email LIKE ? OR u.display_name LIKE ?)');
        params.push(`%${query}%`, `%${query}%`);
      }

      if (status) {
        conditions.push('u.status = ?');
        params.push(status);
      }

      if (role) {
        conditions.push('ur.role_name = ?');
        params.push(role);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      const { rows } = await database.execute(sql, params);
      
      return rows[0].count;
    } catch (error) {
      console.error('User count error:', error);
      throw error;
    }
  }

  // Convert to JSON (remove sensitive data)
  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Get public profile
  getPublicProfile() {
    return {
      user_id: this.user_id,
      email: this.email,
      email_verified: this.email_verified,
      display_name: this.display_name,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;