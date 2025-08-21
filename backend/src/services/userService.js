const { User, Session } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const AuthService = require('./authService');

class UserService {
  // Get user profile
  static async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get user roles
      const roles = await user.getRoles();

      return {
        ...user.getPublicProfile(),
        roles: roles.map(role => ({
          role_name: role.role_name,
          description: role.description,
          assigned_at: role.created_at
        }))
      };
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId, profileData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Handle email change
      if (profileData.email && profileData.email !== user.email) {
        // Require current password for email change
        if (!profileData.current_password) {
          throw new AppError('Current password required for email change', 400, 'PASSWORD_REQUIRED');
        }

        // Verify current password
        if (!user.password_hash) {
          throw new AppError('Account requires password setup', 400, 'PASSWORD_SETUP_REQUIRED');
        }

        const isPasswordValid = await User.verifyPassword(profileData.current_password, user.password_hash);
        if (!isPasswordValid) {
          throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
        }

        // Check if new email is already in use
        const existingUser = await User.findByEmail(profileData.email);
        if (existingUser && existingUser.user_id !== userId) {
          throw new AppError('Email address is already in use', 409, 'EMAIL_EXISTS');
        }

        // Set email as unverified when changed
        profileData.email_verified = false;
      }

      // Remove sensitive fields
      delete profileData.current_password;
      delete profileData.password;
      delete profileData.password_hash;
      delete profileData.user_id;

      // Update profile
      const updated = await user.updateProfile(profileData);
      if (!updated) {
        throw new AppError('No changes made to profile', 400, 'NO_CHANGES');
      }

      // Get updated user data
      const updatedUser = await User.findById(userId);
      const roles = await updatedUser.getRoles();

      // If email was changed, generate new verification token
      let verificationToken = null;
      if (profileData.email && !updatedUser.email_verified) {
        const EmailVerification = require('../models/EmailVerification');
        const { token } = await EmailVerification.create(userId);
        verificationToken = token;
      }

      const result = {
        user: {
          ...updatedUser.getPublicProfile(),
          roles: roles.map(role => ({
            role_name: role.role_name,
            description: role.description,
            assigned_at: role.created_at
          }))
        },
        message: 'Profile updated successfully'
      };

      if (verificationToken) {
        result.verificationToken = verificationToken;
        result.message += '. Please verify your new email address.';
      }

      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      return await AuthService.changePassword(userId, currentPassword, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Get user sessions
  static async getSessions(userId) {
    try {
      const sessions = await Session.findByUserId(userId);
      
      return sessions.map(session => ({
        session_id: session.session_id,
        ip: session.ip,
        user_agent: session.ua,
        created_at: session.created_at,
        expires_at: session.expires_at,
        is_current: false, // This would need session context to determine
        is_valid: session.isValid()
      }));
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  }

  // Revoke session
  static async revokeSession(userId, sessionId) {
    try {
      return await AuthService.revokeSession(sessionId, userId);
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  }

  // Revoke all other sessions (keep current)
  static async revokeOtherSessions(userId, currentSessionId) {
    try {
      const revokedCount = await Session.revokeOtherSessions(userId, currentSessionId);
      
      return {
        message: `${revokedCount} session(s) revoked successfully`,
        revokedCount
      };
    } catch (error) {
      console.error('Revoke other sessions error:', error);
      throw error;
    }
  }

  // Delete user account
  static async deleteAccount(userId, password = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify password if user has one
      if (user.password_hash && password) {
        const isPasswordValid = await User.verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
          throw new AppError('Password is incorrect', 400, 'INVALID_PASSWORD');
        }
      }

      // Soft delete - disable account
      await user.disable();

      // Revoke all sessions
      await Session.revokeAllByUserId(userId);

      return {
        message: 'Account deleted successfully'
      };
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  // Request email verification
  static async requestEmailVerification(userId) {
    try {
      return await AuthService.resendEmailVerification(userId);
    } catch (error) {
      console.error('Request email verification error:', error);
      throw error;
    }
  }

  // Get account statistics
  static async getAccountStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get session count
      const sessionCount = await Session.getActiveSessionsCount(userId);
      
      // Get roles
      const roles = await user.getRoles();

      // Get account age
      const accountAge = Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));

      return {
        account_created: user.created_at,
        account_age_days: accountAge,
        email_verified: user.email_verified,
        status: user.status,
        active_sessions: sessionCount,
        roles: roles.length,
        role_names: roles.map(r => r.role_name),
        last_updated: user.updated_at
      };
    } catch (error) {
      console.error('Get account stats error:', error);
      throw error;
    }
  }

  // Export user data (GDPR compliance)
  static async exportUserData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get roles
      const roles = await user.getRoles();

      // Get sessions
      const sessions = await Session.getSessionInfo(userId);

      // Prepare export data
      const exportData = {
        user_profile: user.toJSON(),
        roles: roles,
        sessions: sessions.map(session => ({
          session_id: session.session_id,
          ip: session.ip,
          user_agent: session.ua,
          created_at: session.created_at,
          expires_at: session.expires_at,
          status: session.status
        })),
        export_date: new Date().toISOString(),
        export_version: '1.0'
      };

      return exportData;
    } catch (error) {
      console.error('Export user data error:', error);
      throw error;
    }
  }

  // Validate user exists and is active
  static async validateUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return { valid: false, reason: 'USER_NOT_FOUND' };
      }

      if (user.status !== 'active') {
        return { valid: false, reason: 'ACCOUNT_DISABLED' };
      }

      return { valid: true, user: user.getPublicProfile() };
    } catch (error) {
      console.error('Validate user error:', error);
      return { valid: false, reason: 'VALIDATION_ERROR' };
    }
  }

  // Check if user has specific permission
  static async hasPermission(userId, permission) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      const roles = await user.getRoles();
      const roleNames = roles.map(r => r.role_name);
      
      const Role = require('../models/Role');
      return Role.hasPermission(roleNames, permission);
    } catch (error) {
      console.error('Check permission error:', error);
      return false;
    }
  }

  // Get user activity summary
  static async getActivitySummary(userId, days = 30) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // This is a basic implementation - in a real app you might have activity logs
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      
      // Get recent sessions
      const { rows: recentSessions } = require('../config/database').execute(
        'SELECT COUNT(*) as session_count FROM sessions WHERE user_id = ? AND created_at > ?',
        [userId, cutoffDate]
      );

      return {
        period_days: days,
        login_count: recentSessions[0]?.session_count || 0,
        last_login: null, // Would need to track this separately
        profile_updates: 0, // Would need activity logging
        password_changes: 0 // Would need activity logging
      };
    } catch (error) {
      console.error('Get activity summary error:', error);
      throw error;
    }
  }
}

module.exports = UserService;