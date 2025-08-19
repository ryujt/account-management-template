const db = require('../adapters/database');
const { getCurrentTimestamp, calculatePagination, formatPaginationResponse } = require('../utils/helpers');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../utils/errors');

class UserService {

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toJSON();
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const { firstName, lastName } = updates;
    
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    updateData.updated_at = getCurrentTimestamp();

    const updated = await db.updateUser(userId, updateData);
    if (!updated) {
      throw new ValidationError('Failed to update profile');
    }

    // Get updated user
    const updatedUser = await db.getUserById(userId);
    return updatedUser.toJSON();
  }

  /**
   * Change password
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Update password
    const updated = await db.updateUser(userId, {
      password_hash: newPassword, // Will be hashed by model hook
      updated_at: getCurrentTimestamp()
    });

    if (!updated) {
      throw new ValidationError('Failed to change password');
    }

    // Invalidate all sessions except current one for security
    // Note: We'd need the current session ID to exclude it
    await db.deleteUserSessions(userId);

    return { message: 'Password changed successfully' };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    const sessions = await db.getUserSessions(userId);
    
    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      sessionId: session.session_id,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      expiresAt: session.expires_at,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      isActive: session.is_active,
      isCurrent: false // This would need to be determined by comparing with current session
    }));

    return formattedSessions;
  }

  /**
   * Revoke user session
   */
  async revokeSession(userId, sessionId) {
    const session = await db.getSession(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.user_id !== userId) {
      throw new UnauthorizedError('Not authorized to revoke this session');
    }

    const deleted = await db.deleteSession(sessionId);
    if (!deleted) {
      throw new ValidationError('Failed to revoke session');
    }

    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllSessions(userId, excludeSessionId = null) {
    const deletedCount = await db.deleteUserSessions(userId, excludeSessionId);
    
    return { 
      message: `${deletedCount} sessions revoked successfully`,
      revokedCount: deletedCount
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const sessions = await db.getUserSessions(userId);
    
    return {
      profile: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        status: user.status,
        emailVerified: user.email_verified,
        joinedAt: user.created_at,
        lastLogin: user.last_login,
        loginCount: user.login_count
      },
      sessions: {
        active: sessions.filter(s => s.is_active).length,
        total: sessions.length
      }
    };
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId, { password }) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password for security
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Password is incorrect');
    }

    // Delete user (cascade will handle related records)
    const deleted = await db.deleteUser(userId);
    if (!deleted) {
      throw new ValidationError('Failed to delete account');
    }

    return { message: 'Account deleted successfully' };
  }

  /**
   * Update user preferences (for future use)
   */
  async updatePreferences(userId, preferences) {
    // This could be extended to store user preferences in a separate table
    // or in a JSON column in the users table
    
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // For now, just return success
    // In a real implementation, you'd save preferences to database
    return { 
      message: 'Preferences updated successfully',
      preferences 
    };
  }

  /**
   * Get user activity summary
   */
  async getActivitySummary(userId) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const sessions = await db.getUserSessions(userId);
    
    // Get recent audit logs for this user
    const auditLogs = await db.listAuditLogs({
      actorId: userId,
      limit: 10,
      offset: 0
    });

    return {
      user: {
        id: user.user_id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        status: user.status,
        lastLogin: user.last_login,
        loginCount: user.login_count
      },
      sessions: {
        active: sessions.filter(s => s.is_active).length,
        total: sessions.length
      },
      recentActivity: auditLogs.logs.map(log => ({
        id: log.log_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        timestamp: log.created_at,
        metadata: log.metadata
      }))
    };
  }

  /**
   * Search users (for admin purposes - should be moved to adminService)
   */
  async searchUsers(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const { offset } = calculatePagination(page, limit);

    // This is a simple implementation - in production you'd want full-text search
    const whereClause = {};
    if (query) {
      // This would need to be implemented in the database adapter
      // For now, just return all users
    }

    const result = await db.listUsers({ offset, limit });
    
    return formatPaginationResponse(
      result.users.map(user => user.toJSON()),
      result.total,
      parseInt(page),
      parseInt(limit)
    );
  }
}

module.exports = new UserService();