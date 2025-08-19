const db = require('../adapters/database');
const emailAdapter = require('../adapters/email');
const { 
  generateId, 
  generateInviteCode, 
  getCurrentTimestamp, 
  getFutureTimestamp,
  calculatePagination,
  formatPaginationResponse
} = require('../utils/helpers');
const { NotFoundError, ValidationError, UnauthorizedError, ConflictError } = require('../utils/errors');

class AdminService {

  /**
   * Create audit log entry
   */
  async createAuditLog(actorId, action, resourceType, resourceId = null, metadata = null, req = null) {
    const logData = {
      log_id: generateId(),
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      ip_address: req ? req.ip : null,
      user_agent: req ? req.get('User-Agent') : null,
      created_at: getCurrentTimestamp()
    };

    return await db.createAuditLog(logData);
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const totalUsers = await db.listUsers({ limit: 1 });
    const activeUsers = await db.listUsers({ status: 'active', limit: 1 });
    const pendingInvites = await db.listInvites({ status: 'pending', limit: 1 });
    
    // Get recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentActivity = await db.listAuditLogs({
      startDate: yesterday.toISOString(),
      limit: 10
    });

    return {
      users: {
        total: totalUsers.total,
        active: activeUsers.total,
        inactive: totalUsers.total - activeUsers.total
      },
      invites: {
        pending: pendingInvites.total
      },
      recentActivity: recentActivity.logs.map(log => ({
        id: log.log_id,
        actor: log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : 'Unknown',
        action: log.action,
        resourceType: log.resource_type,
        timestamp: log.created_at,
        metadata: log.metadata
      }))
    };
  }

  /**
   * List all users with pagination
   */
  async listUsers(options = {}) {
    const { page = 1, limit = 20, status, role } = options;
    const { offset } = calculatePagination(page, limit);

    const result = await db.listUsers({ offset, limit, status, role });
    
    return formatPaginationResponse(
      result.users.map(user => ({
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        status: user.status,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        loginCount: user.login_count,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })),
      result.total,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * Get user details
   */
  async getUserDetails(userId) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const sessions = await db.getUserSessions(userId);
    const auditLogs = await db.listAuditLogs({ actorId: userId, limit: 20 });

    return {
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        status: user.status,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        loginCount: user.login_count,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      sessions: sessions.map(session => ({
        sessionId: session.session_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        expiresAt: session.expires_at,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active
      })),
      auditLogs: auditLogs.logs.map(log => ({
        id: log.log_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        metadata: log.metadata,
        timestamp: log.created_at
      }))
    };
  }

  /**
   * Update user
   */
  async updateUser(adminId, userId, updates, req) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { firstName, lastName, roles, status } = updates;
    const updateData = {};
    
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (roles !== undefined) updateData.roles = roles;
    if (status !== undefined) updateData.status = status;
    
    updateData.updated_at = getCurrentTimestamp();

    const updated = await db.updateUser(userId, updateData);
    if (!updated) {
      throw new ValidationError('Failed to update user');
    }

    // Log the action
    await this.createAuditLog(
      adminId,
      'UPDATE_USER',
      'user',
      userId,
      { updates },
      req
    );

    const updatedUser = await db.getUserById(userId);
    return updatedUser.toJSON();
  }

  /**
   * Delete user
   */
  async deleteUser(adminId, userId, req) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent admin from deleting themselves
    if (adminId === userId) {
      throw new ValidationError('Cannot delete your own account');
    }

    const deleted = await db.deleteUser(userId);
    if (!deleted) {
      throw new ValidationError('Failed to delete user');
    }

    // Log the action
    await this.createAuditLog(
      adminId,
      'DELETE_USER',
      'user',
      userId,
      { deletedUser: user.toJSON() },
      req
    );

    return { message: 'User deleted successfully' };
  }

  /**
   * Create invite
   */
  async createInvite(adminId, { email, role = 'member' }, req) {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Check if there's already a pending invite
    const existingInvites = await db.listInvites({ status: 'pending' });
    const existingInvite = existingInvites.invites.find(invite => invite.email === email);
    
    if (existingInvite) {
      throw new ConflictError('There is already a pending invite for this email');
    }

    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const inviteData = {
      invite_id: generateId(),
      invite_code: inviteCode,
      email,
      role,
      created_by: adminId,
      status: 'pending',
      expires_at: expiresAt,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    const invite = await db.createInvite(inviteData);

    // Send invite email
    try {
      await emailAdapter.sendInvite(invite, inviteCode);
    } catch (error) {
      console.error('Failed to send invite email:', error);
      // Don't fail invite creation if email fails
    }

    // Log the action
    await this.createAuditLog(
      adminId,
      'CREATE_INVITE',
      'invite',
      invite.invite_id,
      { email, role },
      req
    );

    return {
      inviteId: invite.invite_id,
      inviteCode,
      email,
      role,
      expiresAt,
      status: 'pending'
    };
  }

  /**
   * List invites
   */
  async listInvites(options = {}) {
    const { page = 1, limit = 20, status, createdBy } = options;
    const { offset } = calculatePagination(page, limit);

    const result = await db.listInvites({ offset, limit, status, createdBy });
    
    return formatPaginationResponse(
      result.invites.map(invite => ({
        inviteId: invite.invite_id,
        inviteCode: invite.invite_code,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdBy: invite.creator ? `${invite.creator.first_name} ${invite.creator.last_name}` : 'Unknown',
        acceptedBy: invite.acceptor ? `${invite.acceptor.first_name} ${invite.acceptor.last_name}` : null,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
        acceptedAt: invite.accepted_at
      })),
      result.total,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * Revoke invite
   */
  async revokeInvite(adminId, inviteId, req) {
    const invite = await db.getInvite(inviteId);
    if (!invite) {
      throw new NotFoundError('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new ValidationError('Can only revoke pending invites');
    }

    const deleted = await db.deleteInvite(inviteId);
    if (!deleted) {
      throw new ValidationError('Failed to revoke invite');
    }

    // Log the action
    await this.createAuditLog(
      adminId,
      'REVOKE_INVITE',
      'invite',
      inviteId,
      { email: invite.email, role: invite.role },
      req
    );

    return { message: 'Invite revoked successfully' };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      actorId, 
      action, 
      resourceType, 
      startDate, 
      endDate 
    } = options;
    const { offset } = calculatePagination(page, limit);

    const result = await db.listAuditLogs({
      offset,
      limit,
      actorId,
      action,
      resourceType,
      startDate,
      endDate
    });
    
    return formatPaginationResponse(
      result.logs.map(log => ({
        id: log.log_id,
        actor: log.actor ? {
          id: log.actor.user_id,
          name: `${log.actor.first_name} ${log.actor.last_name}`,
          email: log.actor.email
        } : null,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        metadata: log.metadata,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        timestamp: log.created_at
      })),
      result.total,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * Get user roles summary
   */
  async getRolesSummary() {
    // This would ideally be a database aggregation query
    const result = await db.listUsers({ limit: 1000 }); // Get all users for now
    
    const roleCount = {};
    result.users.forEach(user => {
      user.roles.forEach(role => {
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
    });

    return roleCount;
  }

  /**
   * Bulk update user roles
   */
  async bulkUpdateRoles(adminId, userIds, newRoles, req) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const updated = await this.updateUser(adminId, userId, { roles: newRoles }, req);
        results.push({ userId, success: true, user: updated });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return {
      message: `Bulk update completed`,
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }
}

module.exports = new AdminService();