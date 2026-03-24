import bcrypt from 'bcryptjs';
import {
  getUserByEmail,
  getUserRoles,
  getItem,
  getSession,
  putItem,
  updateItem,
  deleteSession,
  deleteAllSessions,
  transactWrite,
  writeAuditLog,
} from '../adapters/dynamodb.mjs';
import { signAccessToken } from '../middleware/auth.mjs';
import {
  generateUserId,
  generateSessionId,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  nowISO,
  epochSecondsFromDays,
} from '../utils/helpers.mjs';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.mjs';

const SALT_ROUNDS = 12;
const SESSION_TTL_DAYS = () => parseInt(process.env.SESSION_TTL_DAYS || '14', 10);

export async function register({ email, password, displayName }) {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const userId = generateUserId();
  const now = nowISO();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const table = process.env.DDB_TABLE || 'ums-main';

  await transactWrite([
    {
      Put: {
        TableName: table,
        Item: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
          userId,
          email,
          passwordHash,
          displayName,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          GSI1PK: `EMAIL#${email}`,
          GSI1SK: `USER#${userId}`,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    },
    {
      Put: {
        TableName: table,
        Item: {
          PK: `EMAIL#${email}`,
          SK: `USER#${userId}`,
          userId,
          GSI1PK: `EMAIL#${email}`,
          GSI1SK: `USER#${userId}`,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    },
    {
      Put: {
        TableName: table,
        Item: {
          PK: `USER#${userId}`,
          SK: 'ROLE#member',
          userId,
          role: 'member',
          createdAt: now,
          GSI2PK: 'ROLE#member',
          GSI2SK: `USER#${userId}`,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    },
  ]);

  writeAuditLog({ action: 'register', userId, email });

  return { userId, email };
}

export async function login({ email, password, ip, ua }) {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const roles = await getUserRoles(user.userId);
  const sessionId = generateSessionId();
  const refreshToken = generateRefreshToken(user.userId, sessionId);
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const ttlDays = SESSION_TTL_DAYS();
  const expiresAt = epochSecondsFromDays(ttlDays);
  const now = nowISO();

  await putItem({
    PK: `USER#${user.userId}`,
    SK: `SESSION#${sessionId}`,
    sessionId,
    userId: user.userId,
    refreshTokenHash,
    ip: ip || 'unknown',
    ua: ua || 'unknown',
    createdAt: now,
    expiresAt,
    TTL: expiresAt,
  });

  const { token: accessToken, expiresIn } = signAccessToken({
    sub: user.userId,
    roles,
    sid: sessionId,
  });

  writeAuditLog({ action: 'login', userId: user.userId, ip });

  return {
    accessToken,
    accessTokenExpiresIn: expiresIn,
    refreshToken,
    sessionTtlSeconds: ttlDays * 86400,
    user: {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      roles,
    },
  };
}

export async function refresh({ refreshTokenRaw, ip, ua }) {
  if (!refreshTokenRaw) {
    throw new UnauthorizedError('No refresh token');
  }

  const parsed = parseRefreshToken(refreshTokenRaw);
  if (!parsed) {
    throw new UnauthorizedError('Invalid refresh token format');
  }

  const { userId, sessionId } = parsed;
  const tokenHash = hashRefreshToken(refreshTokenRaw);

  // Direct GetItem using userId + sessionId extracted from the token (no table scan)
  const session = await getSession(userId, sessionId);

  if (!session) {
    throw new UnauthorizedError('Session not found');
  }

  // Verify token hash
  if (session.refreshTokenHash !== tokenHash) {
    // Possible token reuse attack - invalidate all sessions for safety
    await deleteAllSessions(userId);
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Check expiry
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (session.expiresAt <= nowEpoch) {
    await deleteSession(userId, sessionId);
    throw new UnauthorizedError('Session expired');
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken(userId, sessionId);
  const newHash = hashRefreshToken(newRefreshToken);
  const ttlDays = SESSION_TTL_DAYS();
  const newExpiresAt = epochSecondsFromDays(ttlDays);

  await updateItem(`USER#${userId}`, `SESSION#${sessionId}`, {
    refreshTokenHash: newHash,
    expiresAt: newExpiresAt,
    TTL: newExpiresAt,
    ip: ip || session.ip,
    ua: ua || session.ua,
  });

  const roles = await getUserRoles(userId);
  const user = await getItem(`USER#${userId}`, 'PROFILE');

  const { token: accessToken, expiresIn } = signAccessToken({
    sub: userId,
    roles,
    sid: sessionId,
  });

  return {
    accessToken,
    accessTokenExpiresIn: expiresIn,
    refreshToken: newRefreshToken,
    sessionTtlSeconds: ttlDays * 86400,
    user: user
      ? {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          roles,
        }
      : undefined,
  };
}

export async function logout({ userId, sessionId }) {
  await deleteSession(userId, sessionId);
  writeAuditLog({ action: 'logout', userId, sessionId });
  return { ok: true };
}

export async function resetPassword({ userId, newPassword }) {
  // Requires authentication - userId comes from the JWT token
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await updateItem(`USER#${userId}`, 'PROFILE', {
    passwordHash,
    updatedAt: nowISO(),
  });

  // Invalidate all sessions so user must log in with new password
  await deleteAllSessions(userId);

  writeAuditLog({ action: 'password_reset', userId });

  return { ok: true };
}
