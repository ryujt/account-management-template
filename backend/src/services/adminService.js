const dynamodb = require('../adapters/dynamodb');
const emailAdapter = require('../adapters/email');
const authService = require('./authService');
const { generateInviteCode, getISOTimestamp, getExpiresAtTimestampHours, parseCursor, encodeCursor } = require('../utils/helpers');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

class AdminService {
  async listUsers(query = '', role = '', status = '', cursor = null, limit = 20) {
    let users = [];
    let lastEvaluatedKey = null;

    if (role) {
      const roleUsers = await dynamodb.queryGSI('GSI3', {
        KeyConditionExpression: 'GSI3PK = :role',
        ExpressionAttributeValues: {
          ':role': `ROLE#${role}`
        }
      });

      const userIds = roleUsers.items.map(item => item.GSI3SK.replace('USER#', ''));
      
      for (const userId of userIds) {
        const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');
        if (user) {
          const roles = await authService.getUserRoles(userId);
          users.push({
            userId: user.userId,
            email: user.email,
            displayName: user.displayName,
            roles,
            status: user.status,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
          });
        }
      }
    } else {
      const scanResult = await dynamodb.query({
        KeyConditionExpression: 'begins_with(PK, :userPrefix) AND SK = :profile',
        ExpressionAttributeValues: {
          ':userPrefix': 'USER#',
          ':profile': 'PROFILE'
        },
        Limit: limit,
        ExclusiveStartKey: cursor ? parseCursor(cursor) : undefined
      });

      lastEvaluatedKey = scanResult.lastEvaluatedKey;

      for (const user of scanResult.items) {
        const roles = await authService.getUserRoles(user.userId);
        users.push({
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          roles,
          status: user.status,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        });
      }
    }

    if (query) {
      const queryLower = query.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(queryLower) ||
        user.displayName.toLowerCase().includes(queryLower) ||
        user.userId.toLowerCase().includes(queryLower)
      );
    }

    if (status) {
      users = users.filter(user => user.status === status);
    }

    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      items: users,
      nextCursor: lastEvaluatedKey ? encodeCursor(lastEvaluatedKey) : null
    };
  }

  async getUser(userId) {
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const roles = await authService.getUserRoles(userId);
    
    const sessions = await dynamodb.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SESSION#'
      }
    });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        roles,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      sessions: sessions.items.map(session => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ip: session.ip,
        ua: session.ua
      }))
    };
  }

  async updateUser(userId, updates, actorUserId) {
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

    if (updates.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = updates.status;
    }

    if (updateExpressions.length === 0) {
      return { ok: true };
    }

    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = getISOTimestamp();

    const expressionAttributeNames = updates.status !== undefined ? { '#status': 'status' } : undefined;

    await dynamodb.update(
      `USER#${userId}`,
      'PROFILE',
      `SET ${updateExpressions.join(', ')}`,
      expressionAttributeNames,
      expressionAttributeValues
    );

    await authService.createAuditLog(actorUserId, 'UserUpdated', `USER#${userId}`, updates);

    return { ok: true };
  }

  async assignRole(userId, role, actorUserId) {
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const existingRole = await dynamodb.get(`USER#${userId}`, `ROLE#${role}`);
    if (existingRole) {
      throw new ConflictError('User already has this role');
    }

    const roleItem = {
      PK: `USER#${userId}`,
      SK: `ROLE#${role}`,
      role,
      assignedBy: actorUserId,
      createdAt: getISOTimestamp(),
      GSI3PK: `ROLE#${role}`,
      GSI3SK: `USER#${userId}`
    };

    await dynamodb.put(roleItem);

    await authService.createAuditLog(actorUserId, 'UserRoleAssigned', `USER#${userId}`, { role });

    return { ok: true };
  }

  async revokeRole(userId, role, actorUserId) {
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const existingRole = await dynamodb.get(`USER#${userId}`, `ROLE#${role}`);
    if (!existingRole) {
      throw new NotFoundError('User does not have this role');
    }

    if (role === 'member') {
      throw new BadRequestError('Cannot revoke member role');
    }

    await dynamodb.delete(`USER#${userId}`, `ROLE#${role}`);

    await authService.createAuditLog(actorUserId, 'UserRoleRevoked', `USER#${userId}`, { role });

    return { ok: true };
  }

  async createInvite(role, expiresInHours = 72, actorUserId) {
    const code = generateInviteCode();
    const now = getISOTimestamp();
    const expiresAt = getExpiresAtTimestampHours(expiresInHours);

    const invite = {
      PK: `INVITE#${code}`,
      SK: 'META',
      code,
      role,
      createdBy: actorUserId,
      createdAt: now,
      expiresAt,
      TTL: expiresAt
    };

    await dynamodb.put(invite);

    await authService.createAuditLog(actorUserId, 'InviteCreated', `INVITE#${code}`, { role, expiresInHours });

    return {
      code,
      expiresAt
    };
  }

  async listInvites(actorUserId) {
    const invites = await dynamodb.query({
      KeyConditionExpression: 'begins_with(PK, :invitePrefix) AND SK = :meta',
      ExpressionAttributeValues: {
        ':invitePrefix': 'INVITE#',
        ':meta': 'META'
      }
    });

    return {
      items: invites.items.map(invite => ({
        code: invite.code,
        role: invite.role,
        createdBy: invite.createdBy,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt
      }))
    };
  }

  async getAuditLogs(actor = '', action = '', from = '', to = '', cursor = null, limit = 50) {
    let logs = [];

    if (actor) {
      const actorLogs = await dynamodb.queryGSI('GSI1', {
        KeyConditionExpression: 'GSI1PK = :actor',
        ExpressionAttributeValues: {
          ':actor': `AUDIT#${actor}`
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor ? parseCursor(cursor) : undefined
      });

      logs = actorLogs.items;
    } else {
      const allLogs = await dynamodb.query({
        KeyConditionExpression: 'begins_with(PK, :auditPrefix)',
        ExpressionAttributeValues: {
          ':auditPrefix': 'AUDIT#'
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor ? parseCursor(cursor) : undefined
      });

      logs = allLogs.items;
    }

    if (action) {
      logs = logs.filter(log => log.action === action);
    }

    if (from) {
      logs = logs.filter(log => log.createdAt >= from);
    }

    if (to) {
      logs = logs.filter(log => log.createdAt <= to);
    }

    return {
      items: logs.map(log => ({
        id: log.id,
        actorUserId: log.actorUserId,
        action: log.action,
        resource: log.resource,
        metadata: log.metadata,
        createdAt: log.createdAt
      })),
      nextCursor: logs.length === limit ? encodeCursor({ PK: logs[logs.length - 1].PK, SK: logs[logs.length - 1].SK }) : null
    };
  }
}

module.exports = new AdminService();