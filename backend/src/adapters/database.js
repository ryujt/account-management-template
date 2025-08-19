const { User, Session, Invite, AuditLog, sequelize } = require('../models');
const { Op } = require('sequelize');

class DatabaseAdapter {
  constructor() {
    this.User = User;
    this.Session = Session;
    this.Invite = Invite;
    this.AuditLog = AuditLog;
    this.sequelize = sequelize;
  }

  async connect() {
    try {
      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
      
      // Sync models in development
      if (process.env.APP_ENV === 'development') {
        await this.sequelize.sync({ alter: true });
        console.log('📊 Database models synchronized.');
      }
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.sequelize.close();
    console.log('🔌 Database connection closed.');
  }

  // User operations
  async createUser(userData) {
    return await this.User.create(userData);
  }

  async getUserById(userId) {
    return await this.User.findByPk(userId);
  }

  async getUserByEmail(email) {
    return await this.User.findOne({ where: { email } });
  }

  async updateUser(userId, updates) {
    const [updatedRowsCount] = await this.User.update(updates, {
      where: { user_id: userId }
    });
    return updatedRowsCount > 0;
  }

  async deleteUser(userId) {
    const deletedRowsCount = await this.User.destroy({
      where: { user_id: userId }
    });
    return deletedRowsCount > 0;
  }

  async listUsers(options = {}) {
    const { limit = 20, offset = 0, status, role } = options;
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (role) {
      whereClause.roles = {
        [Op.contains]: role
      };
    }

    const result = await this.User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      users: result.rows,
      total: result.count
    };
  }

  // Session operations
  async createSession(sessionData) {
    return await this.Session.create(sessionData);
  }

  async getSession(sessionId) {
    return await this.Session.findByPk(sessionId, {
      include: [{ model: this.User, as: 'user' }]
    });
  }

  async getSessionByRefreshToken(refreshToken) {
    return await this.Session.findOne({
      where: { refresh_token: refreshToken, is_active: true },
      include: [{ model: this.User, as: 'user' }]
    });
  }

  async getUserSessions(userId) {
    return await this.Session.findAll({
      where: { user_id: userId, is_active: true },
      order: [['updated_at', 'DESC']]
    });
  }

  async updateSession(sessionId, updates) {
    const [updatedRowsCount] = await this.Session.update(updates, {
      where: { session_id: sessionId }
    });
    return updatedRowsCount > 0;
  }

  async deleteSession(sessionId) {
    const deletedRowsCount = await this.Session.destroy({
      where: { session_id: sessionId }
    });
    return deletedRowsCount > 0;
  }

  async deleteUserSessions(userId, excludeSessionId = null) {
    const whereClause = { user_id: userId };
    if (excludeSessionId) {
      whereClause.session_id = { [Op.ne]: excludeSessionId };
    }

    const deletedRowsCount = await this.Session.destroy({
      where: whereClause
    });
    return deletedRowsCount;
  }

  async cleanupExpiredSessions() {
    const deletedRowsCount = await this.Session.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() }
      }
    });
    return deletedRowsCount;
  }

  // Invite operations
  async createInvite(inviteData) {
    return await this.Invite.create(inviteData);
  }

  async getInvite(inviteId) {
    return await this.Invite.findByPk(inviteId, {
      include: [
        { model: this.User, as: 'creator' },
        { model: this.User, as: 'acceptor' }
      ]
    });
  }

  async getInviteByCode(inviteCode) {
    return await this.Invite.findOne({
      where: { invite_code: inviteCode },
      include: [{ model: this.User, as: 'creator' }]
    });
  }

  async listInvites(options = {}) {
    const { limit = 20, offset = 0, status, createdBy } = options;
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (createdBy) whereClause.created_by = createdBy;

    const result = await this.Invite.findAndCountAll({
      where: whereClause,
      include: [
        { model: this.User, as: 'creator' },
        { model: this.User, as: 'acceptor' }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      invites: result.rows,
      total: result.count
    };
  }

  async updateInvite(inviteId, updates) {
    const [updatedRowsCount] = await this.Invite.update(updates, {
      where: { invite_id: inviteId }
    });
    return updatedRowsCount > 0;
  }

  async deleteInvite(inviteId) {
    const deletedRowsCount = await this.Invite.destroy({
      where: { invite_id: inviteId }
    });
    return deletedRowsCount > 0;
  }

  // Audit log operations
  async createAuditLog(logData) {
    return await this.AuditLog.create(logData);
  }

  async listAuditLogs(options = {}) {
    const { limit = 50, offset = 0, actorId, action, resourceType, startDate, endDate } = options;
    const whereClause = {};
    
    if (actorId) whereClause.actor_id = actorId;
    if (action) whereClause.action = action;
    if (resourceType) whereClause.resource_type = resourceType;
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
      if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
    }

    const result = await this.AuditLog.findAndCountAll({
      where: whereClause,
      include: [{ model: this.User, as: 'actor' }],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      logs: result.rows,
      total: result.count
    };
  }

  // Health check
  async healthCheck() {
    try {
      await this.sequelize.authenticate();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new DatabaseAdapter();