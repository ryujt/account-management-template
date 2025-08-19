const dynamodb = require('../adapters/dynamodb');
const authService = require('./authService');
const { getISOTimestamp } = require('../utils/helpers');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

class UserService {
  async getProfile(userId) {
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const roles = await authService.getUserRoles(userId);

    return {
      userId: user.userId,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      roles,
      createdAt: user.createdAt
    };
  }

  async updateProfile(userId, updates) {
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateExpressions = [];
    const expressionAttributeValues = {};

    if (updates.displayName !== undefined) {
      updateExpressions.push('displayName = :displayName');
      expressionAttributeValues[':displayName'] = updates.displayName;
    }

    if (updateExpressions.length === 0) {
      return { ok: true };
    }

    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = getISOTimestamp();

    await dynamodb.update(
      `USER#${userId}`,
      'PROFILE',
      `SET ${updateExpressions.join(', ')}`,
      undefined,
      expressionAttributeValues
    );

    await authService.createAuditLog(userId, 'ProfileUpdated', `USER#${userId}`, updates);

    return { ok: true };
  }

  async getUserSessions(userId) {
    const sessions = await dynamodb.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SESSION#'
      }
    });

    return sessions.items.map(session => ({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ip: session.ip,
      ua: session.ua
    }));
  }

  async revokeSession(userId, sessionId, actorUserId) {
    if (userId !== actorUserId) {
      const actorRoles = await authService.getUserRoles(actorUserId);
      if (!actorRoles.includes('admin')) {
        throw new ForbiddenError('Cannot revoke other user sessions');
      }
    }

    await dynamodb.delete(`USER#${userId}`, `SESSION#${sessionId}`);

    await authService.createAuditLog(actorUserId, 'SessionRevoked', `USER#${userId}`, { sessionId });

    return { ok: true };
  }
}

module.exports = new UserService();