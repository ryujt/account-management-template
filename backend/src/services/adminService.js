const { User, Role, Session, EmailVerification, PasswordReset } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const database = require('../config/database');

class AdminService {
  // Get users with search, filter, and pagination
  static async getUsers(options = {}) {
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

      // Validate sort parameters
      const validSortFields = ['email', 'display_name', 'created_at', 'updated_at', 'status'];
      const validSortOrders = ['ASC', 'DESC'];

      if (!validSortFields.includes(sortBy)) {
        throw new AppError('Invalid sort field', 400, 'INVALID_SORT_FIELD');
      }

      if (!validSortOrders.includes(sortOrder)) {
        throw new AppError('Invalid sort order', 400, 'INVALID_SORT_ORDER');
      }

      // Get users and total count
      const [users, total] = await Promise.all([
        User.findAll({ query, role, status, limit, offset, sortBy, sortOrder }),
        User.count({ query, role, status })
      ]);

      return {
        users,
        pagination: {
          total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1
        }
      };
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  // Get user details by ID
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get additional user information
      const [roles, sessions, stats] = await Promise.all([
        user.getRoles(),
        Session.getSessionInfo(userId),
        AdminService.getUserStats(userId)
      ]);

      return {
        user: user.toJSON(),
        roles: roles.map(role => ({
          role_name: role.role_name,
          description: role.description,
          assigned_at: role.created_at,
          assigned_by: role.assigned_by
        })),
        sessions: sessions,
        stats
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  // Update user (admin action)
  static async updateUser(userId, updateData, adminUserId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prevent admin from disabling themselves
      if (userId === adminUserId && updateData.status === 'disabled') {
        throw new AppError('Cannot disable your own account', 400, 'CANNOT_DISABLE_SELF');
      }

      // Handle email change
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser && existingUser.user_id !== userId) {
          throw new AppError('Email address is already in use', 409, 'EMAIL_EXISTS');
        }
      }

      // Update user
      const allowedFields = ['email', 'display_name', 'status', 'email_verified'];
      const updates = {};
      
      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          updates[field] = updateData[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
      }

      const updated = await user.updateProfile(updates);
      if (!updated) {
        throw new AppError('Failed to update user', 500, 'UPDATE_FAILED');
      }

      // If user was disabled, revoke all sessions
      if (updates.status === 'disabled') {
        await Session.revokeAllByUserId(userId);
      }

      // Get updated user data
      const updatedUser = await User.findById(userId);
      const roles = await updatedUser.getRoles();

      return {
        user: {
          ...updatedUser.toJSON(),
          roles: roles.map(role => ({
            role_name: role.role_name,
            description: role.description,
            assigned_at: role.created_at
          }))
        },
        message: 'User updated successfully'
      };
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // Assign role to user
  static async assignRole(userId, roleName, adminUserId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if role exists
      const role = await Role.findByName(roleName);
      if (!role) {
        throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
      }

      // Check if user already has the role
      const hasRole = await user.hasRole(roleName);
      if (hasRole) {
        throw new AppError('User already has this role', 409, 'ROLE_ALREADY_ASSIGNED');
      }

      // Prevent admin from removing admin role from themselves
      if (userId === adminUserId && roleName === 'admin') {
        const adminRole = await user.hasRole('admin');
        if (!adminRole) {
          throw new AppError('Cannot assign admin role to yourself', 400, 'CANNOT_SELF_ASSIGN_ADMIN');
        }
      }

      // Assign role
      const assigned = await user.assignRole(roleName, adminUserId);
      if (!assigned) {
        throw new AppError('Failed to assign role', 500, 'ROLE_ASSIGNMENT_FAILED');
      }

      return {
        message: `Role '${roleName}' assigned successfully`,
        user_id: userId,
        role_name: roleName,
        assigned_by: adminUserId
      };
    } catch (error) {
      console.error('Assign role error:', error);
      throw error;
    }
  }

  // Remove role from user
  static async removeRole(userId, roleName, adminUserId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user has the role
      const hasRole = await user.hasRole(roleName);
      if (!hasRole) {
        throw new AppError('User does not have this role', 404, 'ROLE_NOT_FOUND');
      }

      // Prevent admin from removing admin role from themselves
      if (userId === adminUserId && roleName === 'admin') {
        throw new AppError('Cannot remove admin role from yourself', 400, 'CANNOT_REMOVE_SELF_ADMIN');
      }

      // Remove role
      const removed = await user.removeRole(roleName);
      if (!removed) {
        throw new AppError('Failed to remove role', 500, 'ROLE_REMOVAL_FAILED');
      }

      return {
        message: `Role '${roleName}' removed successfully`,
        user_id: userId,
        role_name: roleName,
        removed_by: adminUserId
      };
    } catch (error) {
      console.error('Remove role error:', error);
      throw error;
    }
  }

  // Get all roles
  static async getRoles() {
    try {
      const roles = await Role.findAll();
      const roleStats = await Role.getStats();

      return {
        roles: roles.map(role => role.toJSON()),
        statistics: roleStats
      };
    } catch (error) {
      console.error('Get roles error:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(userId) {
    try {
      const { rows } = await database.execute(`
        SELECT 
          (SELECT COUNT(*) FROM sessions WHERE user_id = ? AND revoked_at IS NULL) as active_sessions,
          (SELECT COUNT(*) FROM sessions WHERE user_id = ?) as total_sessions,
          (SELECT COUNT(*) FROM email_verifications WHERE user_id = ?) as email_verifications,
          (SELECT COUNT(*) FROM password_resets WHERE user_id = ?) as password_resets,
          (SELECT COUNT(*) FROM user_roles WHERE user_id = ?) as role_count
      `, [userId, userId, userId, userId, userId]);

      return rows[0] || {};
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const { rows } = await database.execute(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
          (SELECT COUNT(*) FROM users WHERE status = 'disabled') as disabled_users,
          (SELECT COUNT(*) FROM users WHERE email_verified = 1) as verified_users,
          (SELECT COUNT(*) FROM users WHERE email_verified = 0) as unverified_users,
          (SELECT COUNT(*) FROM sessions WHERE revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)) as active_sessions,
          (SELECT COUNT(*) FROM users WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 24 HOUR)) as new_users_24h,
          (SELECT COUNT(*) FROM users WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)) as new_users_7d,
          (SELECT COUNT(*) FROM sessions WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 24 HOUR)) as new_sessions_24h
      `);

      // Get role statistics
      const roleStats = await Role.getStats();

      // Get token statistics
      const [emailStats, resetStats] = await Promise.all([
        EmailVerification.getStats(),
        PasswordReset.getStats()
      ]);

      return {
        users: {
          total: rows[0].active_users + rows[0].disabled_users,
          active: rows[0].active_users,
          disabled: rows[0].disabled_users,
          verified: rows[0].verified_users,
          unverified: rows[0].unverified_users,
          new_24h: rows[0].new_users_24h,
          new_7d: rows[0].new_users_7d
        },
        sessions: {
          active: rows[0].active_sessions,
          new_24h: rows[0].new_sessions_24h
        },
        roles: roleStats,
        tokens: {
          email_verifications: emailStats,
          password_resets: resetStats
        }
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  // Get system activity log (simplified version)
  static async getActivityLog(limit = 50, offset = 0) {
    try {
      // This is a simplified version - in a real system you'd have an audit log table
      const { rows } = await database.execute(`
        SELECT 
          'user_created' as activity_type,
          display_name as details,
          created_at as timestamp,
          user_id
        FROM users 
        WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY)
        
        UNION ALL
        
        SELECT 
          'session_created' as activity_type,
          CONCAT('IP: ', COALESCE(ip, 'unknown')) as details,
          created_at as timestamp,
          user_id
        FROM sessions 
        WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
        
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      // Get total count for pagination
      const { rows: countRows } = await database.execute(`
        SELECT COUNT(*) as total FROM (
          SELECT user_id FROM users WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY)
          UNION ALL
          SELECT user_id FROM sessions WHERE created_at > DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
        ) as combined
      `);

      return {
        activities: rows,
        pagination: {
          total: countRows[0].total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1
        }
      };
    } catch (error) {
      console.error('Get activity log error:', error);
      throw error;
    }
  }

  // Force password reset for user
  static async forcePasswordReset(userId, adminUserId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prevent admin from forcing password reset on themselves
      if (userId === adminUserId) {
        throw new AppError('Cannot force password reset on yourself', 400, 'CANNOT_FORCE_SELF');
      }

      // Generate password reset token
      const PasswordReset = require('../models/PasswordReset');
      const { token } = await PasswordReset.create(userId);

      // Revoke all user sessions for security
      await Session.revokeAllByUserId(userId);

      return {
        message: 'Password reset forced successfully',
        resetToken: token,
        user: user.getPublicProfile()
      };
    } catch (error) {
      console.error('Force password reset error:', error);
      throw error;
    }
  }

  // Revoke all user sessions (admin action)
  static async revokeAllUserSessions(userId, adminUserId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prevent admin from revoking their own sessions
      if (userId === adminUserId) {
        throw new AppError('Cannot revoke your own sessions', 400, 'CANNOT_REVOKE_SELF');
      }

      const revokedCount = await Session.revokeAllByUserId(userId);

      return {
        message: `All sessions revoked for user`,
        user_id: userId,
        revoked_sessions: revokedCount
      };
    } catch (error) {
      console.error('Revoke all user sessions error:', error);
      throw error;
    }
  }

  // System cleanup (admin action)
  static async performSystemCleanup() {
    try {
      const AuthService = require('./authService');
      const cleanup = await AuthService.cleanup();

      return {
        message: 'System cleanup completed successfully',
        cleaned: cleanup
      };
    } catch (error) {
      console.error('System cleanup error:', error);
      throw error;
    }
  }

  // Export users data (admin function)
  static async exportUsersData(filters = {}) {
    try {
      const users = await User.findAll({
        ...filters,
        limit: 10000, // Large limit for export
        offset: 0
      });

      const exportData = {
        export_date: new Date().toISOString(),
        export_version: '1.0',
        filters_applied: filters,
        total_users: users.length,
        users: await Promise.all(users.map(async (user) => {
          const roles = await user.getRoles();
          return {
            ...user.toJSON(),
            roles: roles.map(r => r.role_name)
          };
        }))
      };

      return exportData;
    } catch (error) {
      console.error('Export users data error:', error);
      throw error;
    }
  }

  // Validate admin permissions
  static async validateAdminAccess(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { valid: false, reason: 'USER_NOT_FOUND' };
      }

      if (user.status !== 'active') {
        return { valid: false, reason: 'ACCOUNT_DISABLED' };
      }

      const hasAdminRole = await user.hasRole('admin');
      if (!hasAdminRole) {
        return { valid: false, reason: 'INSUFFICIENT_PERMISSIONS' };
      }

      return { valid: true, user: user.getPublicProfile() };
    } catch (error) {
      console.error('Validate admin access error:', error);
      return { valid: false, reason: 'VALIDATION_ERROR' };
    }
  }
}

module.exports = AdminService;