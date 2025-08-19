const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dynamodb = require('../adapters/dynamodb');
const emailAdapter = require('../adapters/email');
const config = require('../config/config');
const { generateId, getISOTimestamp, getUnixTimestamp, getExpiresAtTimestamp, getExpiresAtTimestampHours } = require('../utils/helpers');
const { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } = require('../utils/errors');

class AuthService {
  async register(email, password, displayName, inviteCode = null) {
    const emailLower = email.toLowerCase();
    
    const existingUser = await dynamodb.queryGSI('GSI1', {
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${emailLower}`
      },
      Limit: 1
    });

    if (existingUser.items.length > 0) {
      throw new ConflictError('Email already registered');
    }

    let role = 'member';
    if (inviteCode) {
      const invite = await dynamodb.get(`INVITE#${inviteCode}`, 'META');
      if (!invite) {
        throw new BadRequestError('Invalid invite code');
      }
      if (invite.expiresAt < getUnixTimestamp()) {
        throw new BadRequestError('Invite code expired');
      }
      role = invite.role;
      await dynamodb.delete(`INVITE#${inviteCode}`, 'META');
    }

    const userId = generateId('u');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = getISOTimestamp();

    const user = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      userId,
      email,
      emailLower,
      emailVerified: false,
      passwordHash,
      displayName,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      GSI1PK: `EMAIL#${emailLower}`,
      GSI1SK: `USER#${userId}`
    };

    const emailIndex = {
      PK: `EMAIL#${emailLower}`,
      SK: `USER#${userId}`,
      userId,
      createdAt: now
    };

    const userRole = {
      PK: `USER#${userId}`,
      SK: `ROLE#${role}`,
      role,
      assignedBy: 'system',
      createdAt: now,
      GSI3PK: `ROLE#${role}`,
      GSI3SK: `USER#${userId}`
    };

    await dynamodb.batchWrite([
      { PutRequest: { Item: user } },
      { PutRequest: { Item: emailIndex } },
      { PutRequest: { Item: userRole } }
    ]);

    const verifyToken = generateId('v');
    const verifyItem = {
      PK: `USER#${userId}`,
      SK: `VERIFY#${verifyToken}`,
      tokenId: verifyToken,
      createdAt: now,
      expiresAt: getExpiresAtTimestampHours(24),
      TTL: getExpiresAtTimestampHours(24),
      GSI2PK: `TOKEN#${verifyToken}`,
      GSI2SK: 'TYPE#Verify'
    };
    await dynamodb.put(verifyItem);

    await emailAdapter.sendVerificationEmail(email, verifyToken);

    return {
      userId,
      email,
      emailVerified: false
    };
  }

  async login(email, password) {
    const emailLower = email.toLowerCase();
    
    const userIndex = await dynamodb.queryGSI('GSI1', {
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${emailLower}`
      },
      Limit: 1
    });

    if (userIndex.items.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const userId = userIndex.items[0].userId;
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const roles = await this.getUserRoles(userId);

    const accessToken = jwt.sign(
      { sub: userId, roles },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const sessionId = generateId('s');
    const refreshToken = generateId('rt');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const now = getISOTimestamp();

    const session = {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
      sessionId,
      refreshTokenHash,
      ip: '0.0.0.0',
      ua: 'Unknown',
      createdAt: now,
      expiresAt: getExpiresAtTimestamp(config.session.ttlDays),
      TTL: getExpiresAtTimestamp(config.session.ttlDays),
      GSI2PK: `TOKEN#${sessionId}`,
      GSI2SK: 'TYPE#Session'
    };

    await dynamodb.put(session);

    await this.createAuditLog(userId, 'UserLoggedIn', `USER#${userId}`, {});

    return {
      accessToken,
      accessTokenExpiresIn: config.jwt.expiresIn,
      refreshToken,
      user: {
        userId,
        email: user.email,
        displayName: user.displayName,
        roles
      }
    };
  }

  async refresh(refreshToken) {
    const sessions = await dynamodb.query({
      KeyConditionExpression: 'begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':sk': 'SESSION#'
      }
    });

    let validSession = null;
    for (const session of sessions.items) {
      const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (valid) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (validSession.expiresAt < getUnixTimestamp()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const userId = validSession.PK.replace('USER#', '');
    const roles = await this.getUserRoles(userId);

    const accessToken = jwt.sign(
      { sub: userId, roles },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return {
      accessToken,
      accessTokenExpiresIn: config.jwt.expiresIn
    };
  }

  async logout(userId, refreshToken) {
    const sessions = await dynamodb.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SESSION#'
      }
    });

    for (const session of sessions.items) {
      const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (valid) {
        await dynamodb.delete(session.PK, session.SK);
        break;
      }
    }

    await this.createAuditLog(userId, 'UserLoggedOut', `USER#${userId}`, {});

    return { ok: true };
  }

  async verifyEmail(token) {
    const tokenData = await dynamodb.queryGSI('GSI2', {
      KeyConditionExpression: 'GSI2PK = :token AND GSI2SK = :type',
      ExpressionAttributeValues: {
        ':token': `TOKEN#${token}`,
        ':type': 'TYPE#Verify'
      },
      Limit: 1
    });

    if (tokenData.items.length === 0) {
      throw new BadRequestError('Invalid or expired token');
    }

    const verifyToken = tokenData.items[0];
    if (verifyToken.expiresAt < getUnixTimestamp()) {
      throw new BadRequestError('Token expired');
    }

    const userId = verifyToken.PK.replace('USER#', '');

    await dynamodb.update(
      `USER#${userId}`,
      'PROFILE',
      'SET emailVerified = :true, updatedAt = :now',
      undefined,
      {
        ':true': true,
        ':now': getISOTimestamp()
      }
    );

    await dynamodb.delete(verifyToken.PK, verifyToken.SK);

    return { ok: true };
  }

  async forgotPassword(email) {
    const emailLower = email.toLowerCase();
    
    const userIndex = await dynamodb.queryGSI('GSI1', {
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${emailLower}`
      },
      Limit: 1
    });

    if (userIndex.items.length === 0) {
      return { ok: true };
    }

    const userId = userIndex.items[0].userId;
    const user = await dynamodb.get(`USER#${userId}`, 'PROFILE');

    if (!user || user.status !== 'active') {
      return { ok: true };
    }

    const resetToken = generateId('r');
    const now = getISOTimestamp();

    const resetItem = {
      PK: `USER#${userId}`,
      SK: `PWRST#${resetToken}`,
      tokenId: resetToken,
      createdAt: now,
      expiresAt: getExpiresAtTimestampHours(1),
      TTL: getExpiresAtTimestampHours(1),
      GSI2PK: `TOKEN#${resetToken}`,
      GSI2SK: 'TYPE#PwdReset'
    };

    await dynamodb.put(resetItem);
    await emailAdapter.sendPasswordResetEmail(user.email, resetToken);

    return { ok: true };
  }

  async resetPassword(token, newPassword) {
    const tokenData = await dynamodb.queryGSI('GSI2', {
      KeyConditionExpression: 'GSI2PK = :token AND GSI2SK = :type',
      ExpressionAttributeValues: {
        ':token': `TOKEN#${token}`,
        ':type': 'TYPE#PwdReset'
      },
      Limit: 1
    });

    if (tokenData.items.length === 0) {
      throw new BadRequestError('Invalid or expired token');
    }

    const resetToken = tokenData.items[0];
    if (resetToken.expiresAt < getUnixTimestamp()) {
      throw new BadRequestError('Token expired');
    }

    const userId = resetToken.PK.replace('USER#', '');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await dynamodb.update(
      `USER#${userId}`,
      'PROFILE',
      'SET passwordHash = :hash, updatedAt = :now',
      undefined,
      {
        ':hash': passwordHash,
        ':now': getISOTimestamp()
      }
    );

    await dynamodb.delete(resetToken.PK, resetToken.SK);

    await this.createAuditLog(userId, 'PasswordReset', `USER#${userId}`, {});

    return { ok: true };
  }

  async getUserRoles(userId) {
    const roles = await dynamodb.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'ROLE#'
      }
    });

    return roles.items.map(item => item.role);
  }

  async createAuditLog(actorUserId, action, resource, metadata) {
    const now = getISOTimestamp();
    const date = now.split('T')[0];
    const id = generateId('a');

    const auditLog = {
      PK: `AUDIT#${date}`,
      SK: `${now}#${id}`,
      id,
      actorUserId,
      action,
      resource,
      metadata,
      createdAt: now,
      GSI1PK: `AUDIT#${actorUserId}`,
      GSI1SK: `${now}#${id}`
    };

    await dynamodb.put(auditLog);
  }
}

module.exports = new AuthService();