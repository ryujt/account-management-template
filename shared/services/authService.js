import { generateUserId, generateSessionId } from '../utils/id.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { generateRefreshToken, parseRefreshToken, hashRefreshToken } from '../utils/token.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';
import * as userModel from '../models/userModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as auditModel from '../models/auditModel.js';

/**
 * Register a new user with the 'member' role.
 * Uses DynamoDB conditional PutItem to prevent duplicate emails.
 *
 * @param {{ email: string, password: string, displayName: string }} data
 * @returns {Promise<{ userId: string }>}
 */
export async function register({ email, password, displayName }) {
  const userId = generateUserId();
  const passwordHash = await hashPassword(password);

  // createUser uses a conditional PutItem that throws ConflictError on duplicate email
  await userModel.createUser({ userId, email, passwordHash, displayName });

  await auditModel.writeAudit({ action: 'user.register', actorId: userId, targetId: userId });

  return { userId };
}

/**
 * Authenticate a user and create a session.
 *
 * @param {{ email: string, password: string, ip?: string, ua?: string, jwtSecret: string, jwtExpiresIn: number, sessionTtlDays: number }} data
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
export async function login({ email, password, ip, ua, jwtSecret, jwtExpiresIn, sessionTtlDays }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const roles = user.roles ?? [];
  const sessionId = generateSessionId();
  const refreshToken = generateRefreshToken(user.userId, sessionId);
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlDays * 86400;

  await sessionModel.createSession({
    sessionId,
    userId: user.userId,
    refreshTokenHash,
    ip,
    ua,
    expiresAt,
  });

  const accessToken = signAccessToken({ userId: user.userId, roles, sessionId }, jwtSecret, jwtExpiresIn);

  await auditModel.writeAudit({ action: 'user.login', actorId: user.userId, ip });

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      roles,
    },
  };
}

/**
 * Refresh an access token using the refresh token cookie.
 *
 * @param {{ refreshTokenCookie: string, jwtSecret: string, jwtExpiresIn: number }} data
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export async function refresh({ refreshTokenCookie, jwtSecret, jwtExpiresIn }) {
  if (!refreshTokenCookie) {
    throw new UnauthorizedError('Missing refresh token');
  }

  let parsed;
  try {
    parsed = parseRefreshToken(refreshTokenCookie);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // userId is embedded in the refresh token - no need to look it up separately
  const session = await sessionModel.findSession(parsed.userId, parsed.sessionId);
  if (!session) {
    throw new UnauthorizedError('Session not found');
  }

  // Check expiry (manual check because DynamoDB TTL has ~48hr lag)
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt <= now) {
    await sessionModel.deleteSession(parsed.userId, parsed.sessionId);
    throw new UnauthorizedError('Session expired');
  }

  // Verify hash
  const incomingHash = hashRefreshToken(refreshTokenCookie);
  if (incomingHash !== session.refreshTokenHash) {
    // Possible token theft: kill the session
    await sessionModel.deleteSession(parsed.userId, parsed.sessionId);
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Verify user still active
  const user = await userModel.findById(session.userId);
  if (!user || user.status !== 'active') {
    await sessionModel.deleteSession(parsed.userId, parsed.sessionId);
    throw new UnauthorizedError('Account is not active');
  }

  // Rotate refresh token
  const roles = user.roles ?? [];
  const newRefreshToken = generateRefreshToken(session.userId, session.sessionId);
  const newHash = hashRefreshToken(newRefreshToken);
  await sessionModel.updateRefreshToken(session.userId, session.sessionId, newHash);

  const accessToken = signAccessToken(
    { userId: session.userId, roles, sessionId: session.sessionId },
    jwtSecret,
    jwtExpiresIn,
  );

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Log out by deleting the session.
 *
 * @param {{ userId: string, sessionId: string }} data
 */
export async function logout({ userId, sessionId }) {
  await sessionModel.deleteSession(userId, sessionId);
}

/**
 * Reset a user's password and kill all their sessions.
 *
 * @param {{ email: string, newPassword: string }} data
 */
export async function resetPassword({ email, newPassword }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    // Return silently to prevent email enumeration
    return;
  }

  const passwordHash = await hashPassword(newPassword);

  await Promise.all([
    userModel.updatePassword(user.userId, passwordHash),
    sessionModel.deleteUserSessions(user.userId),
  ]);

  await auditModel.writeAudit({
    action: 'user.password_reset',
    actorId: user.userId,
    targetId: user.userId,
  });
}
