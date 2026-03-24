import {
  getItem,
  updateItem,
  putItem,
  deleteItem,
  getUserRoles,
  getUserSessions,
  deleteAllSessions,
  query,
  scan,
  writeAuditLog,
} from '../adapters/dynamodb.mjs';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.mjs';
import { nowISO } from '../utils/helpers.mjs';

export async function listUsers({ queryStr, role, status, cursor, limit = 20 }) {
  limit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  let exclusiveStartKey = null;
  if (cursor) {
    try {
      exclusiveStartKey = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8')
      );
    } catch {
      throw new BadRequestError('Invalid cursor');
    }
  }

  // If filtering by role, use GSI2
  if (role) {
    const params = {
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `ROLE#${role}` },
      Limit: limit,
    };
    if (exclusiveStartKey) params.ExclusiveStartKey = exclusiveStartKey;

    const { items: roleItems, lastKey } = await query(params);

    // For each role item, fetch the user profile
    const users = await Promise.all(
      roleItems.map(async (ri) => {
        const userId = ri.GSI2SK?.replace('USER#', '') || ri.userId;
        const user = await getItem(`USER#${userId}`, 'PROFILE');
        if (!user) return null;
        const roles = await getUserRoles(userId);
        return {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          roles,
          status: user.status,
          createdAt: user.createdAt,
        };
      })
    );

    const filtered = users.filter((u) => {
      if (!u) return false;
      if (status && u.status !== status) return false;
      if (queryStr) {
        const q = queryStr.toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const nextCursor = lastKey
      ? Buffer.from(JSON.stringify(lastKey)).toString('base64url')
      : null;

    return { items: filtered, nextCursor };
  }

  // No role filter: scan PROFILE items
  const filterParts = ['SK = :profile'];
  const exprValues = { ':profile': 'PROFILE' };
  const exprNames = {};

  if (status) {
    filterParts.push('#st = :status');
    exprValues[':status'] = status;
    exprNames['#st'] = 'status';
  }

  if (queryStr) {
    filterParts.push('(contains(email, :q) OR contains(displayName, :q))');
    exprValues[':q'] = queryStr.toLowerCase();
  }

  const scanParams = {
    FilterExpression: filterParts.join(' AND '),
    ExpressionAttributeValues: exprValues,
    Limit: limit * 3, // Over-fetch since scan with filter can miss
  };

  if (Object.keys(exprNames).length > 0) {
    scanParams.ExpressionAttributeNames = exprNames;
  }

  if (exclusiveStartKey) scanParams.ExclusiveStartKey = exclusiveStartKey;

  const { items: rawItems, lastKey } = await scan(scanParams);

  // Fetch roles for each user
  const users = await Promise.all(
    rawItems.slice(0, limit).map(async (user) => {
      const roles = await getUserRoles(user.userId);
      return {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        roles,
        status: user.status,
        createdAt: user.createdAt,
      };
    })
  );

  const nextCursor = lastKey
    ? Buffer.from(JSON.stringify(lastKey)).toString('base64url')
    : null;

  return { items: users, nextCursor };
}

export async function getUserDetail(userId) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  const roles = await getUserRoles(userId);
  const sessions = await getUserSessions(userId);
  const nowEpoch = Math.floor(Date.now() / 1000);

  return {
    user: {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      roles,
      status: user.status,
      createdAt: user.createdAt,
    },
    sessions: sessions
      .filter((s) => s.expiresAt > nowEpoch)
      .map((s) => ({
        sessionId: s.sessionId,
        ip: s.ip,
        ua: s.ua,
        createdAt: s.createdAt,
      })),
  };
}

export async function updateUserStatus(userId, status, adminUserId) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  if (user.status === 'withdrawn') {
    throw new BadRequestError('Cannot modify a withdrawn account');
  }

  await updateItem(`USER#${userId}`, 'PROFILE', {
    status,
    updatedAt: nowISO(),
  });

  // If disabling or suspending, kill all sessions
  if (status === 'disabled' || status === 'suspended') {
    await deleteAllSessions(userId);
  }

  writeAuditLog({
    action: 'status_change',
    targetUserId: userId,
    newStatus: status,
    adminUserId,
  });

  return { ok: true };
}

export async function addRole(userId, role, adminUserId) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  const existing = await getItem(`USER#${userId}`, `ROLE#${role}`);
  if (existing) {
    throw new ConflictError(`User already has role: ${role}`);
  }

  await putItem({
    PK: `USER#${userId}`,
    SK: `ROLE#${role}`,
    userId,
    role,
    createdAt: nowISO(),
    GSI2PK: `ROLE#${role}`,
    GSI2SK: `USER#${userId}`,
  });

  writeAuditLog({
    action: 'role_add',
    targetUserId: userId,
    role,
    adminUserId,
  });

  return { ok: true };
}

export async function removeRole(userId, role, adminUserId) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  if (role === 'member') {
    throw new BadRequestError('Cannot remove the member role');
  }

  // Prevent admin from removing their own admin role
  if (role === 'admin' && userId === adminUserId) {
    throw new BadRequestError('Cannot remove your own admin role');
  }

  const existing = await getItem(`USER#${userId}`, `ROLE#${role}`);
  if (!existing) {
    throw new NotFoundError(`User does not have role: ${role}`);
  }

  await deleteItem(`USER#${userId}`, `ROLE#${role}`);

  writeAuditLog({
    action: 'role_remove',
    targetUserId: userId,
    role,
    adminUserId,
  });

  return { ok: true };
}
