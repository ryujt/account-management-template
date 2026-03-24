import { generateUserId, generateSessionId } from '../utils/id.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { generateRefreshToken, parseRefreshToken, hashRefreshToken } from '../utils/token.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import * as userModel from '../models/userModel.js';
import * as roleModel from '../models/roleModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as auditModel from '../models/auditModel.js';

/**
 * Register a new user with the 'member' role.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ email: string, password: string, displayName: string }} data
 * @returns {{ userId: string }}
 */
export function register(db, { email, password, displayName }) {
  const existing = userModel.findByEmail(db, email);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const userId = generateUserId();

  // hashPassword is async, so we need to handle this carefully.
  // Since better-sqlite3 is synchronous, we return a promise that resolves after the async hash.
  return hashPassword(password).then((passwordHash) => {
    const tx = db.transaction(() => {
      userModel.createUser(db, { userId, email, passwordHash, displayName });
      roleModel.addRole(db, userId, 'member');
    });
    tx();

    auditModel.writeAudit(db, { action: 'user.register', actorId: userId, targetId: userId });

    return { userId };
  });
}

/**
 * Authenticate a user and create a session.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ email: string, password: string, ip?: string, ua?: string, jwtSecret: string, jwtExpiresIn: number, sessionTtlDays: number }} data
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
export async function login(db, { email, password, ip, ua, jwtSecret, jwtExpiresIn, sessionTtlDays }) {
  const user = userModel.findByEmail(db, email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const roles = roleModel.getRoles(db, user.user_id);
  const sessionId = generateSessionId();
  const refreshToken = generateRefreshToken(user.user_id, sessionId);
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlDays * 86400;

  sessionModel.createSession(db, {
    sessionId,
    userId: user.user_id,
    refreshTokenHash,
    ip,
    ua,
    expiresAt,
  });

  const accessToken = signAccessToken({ userId: user.user_id, roles, sessionId }, jwtSecret, jwtExpiresIn);

  auditModel.writeAudit(db, { action: 'user.login', actorId: user.user_id, ip });

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name,
      roles,
    },
  };
}

/**
 * Refresh an access token using the refresh token cookie.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ refreshTokenCookie: string, jwtSecret: string, jwtExpiresIn: number }} data
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function refresh(db, { refreshTokenCookie, jwtSecret, jwtExpiresIn }) {
  if (!refreshTokenCookie) {
    throw new UnauthorizedError('Missing refresh token');
  }

  let parsed;
  try {
    parsed = parseRefreshToken(refreshTokenCookie);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const session = sessionModel.findSession(db, parsed.sessionId);
  if (!session) {
    throw new UnauthorizedError('Session not found');
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at <= now) {
    sessionModel.deleteSession(db, parsed.sessionId);
    throw new UnauthorizedError('Session expired');
  }

  // Verify hash
  const incomingHash = hashRefreshToken(refreshTokenCookie);
  if (incomingHash !== session.refresh_token_hash) {
    // Possible token theft: kill the session
    sessionModel.deleteSession(db, parsed.sessionId);
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Verify user still active
  const user = userModel.findById(db, session.user_id);
  if (!user || user.status !== 'active') {
    sessionModel.deleteSession(db, parsed.sessionId);
    throw new UnauthorizedError('Account is not active');
  }

  // Rotate refresh token
  const roles = roleModel.getRoles(db, session.user_id);
  const newRefreshToken = generateRefreshToken(session.user_id, session.session_id);
  const newHash = hashRefreshToken(newRefreshToken);
  sessionModel.updateRefreshToken(db, session.session_id, newHash);

  const accessToken = signAccessToken(
    { userId: session.user_id, roles, sessionId: session.session_id },
    jwtSecret,
    jwtExpiresIn,
  );

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Log out by deleting the session.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ sessionId: string }} data
 */
export function logout(db, { sessionId }) {
  sessionModel.deleteSession(db, sessionId);
}

/**
 * Reset a user's password and kill all their sessions.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ email: string, newPassword: string }} data
 */
export async function resetPassword(db, { email, newPassword }) {
  const user = userModel.findByEmail(db, email);
  if (!user) {
    // Return silently to prevent email enumeration
    return;
  }

  const passwordHash = await hashPassword(newPassword);

  const tx = db.transaction(() => {
    userModel.updatePassword(db, user.user_id, passwordHash);
    sessionModel.deleteUserSessions(db, user.user_id);
  });
  tx();

  auditModel.writeAudit(db, { action: 'user.password_reset', actorId: user.user_id, targetId: user.user_id });
}
