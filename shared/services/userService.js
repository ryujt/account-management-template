import { comparePassword, hashPassword } from '../utils/password.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors.js';
import * as userModel from '../models/userModel.js';
import * as roleModel from '../models/roleModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as auditModel from '../models/auditModel.js';

/**
 * Get a user's profile including roles.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function getProfile(db, userId) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const roles = roleModel.getRoles(db, userId);

  return {
    userId: user.user_id,
    email: user.email,
    displayName: user.display_name,
    status: user.status,
    roles,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Update a user's display name.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {{ displayName: string }} fields
 */
export function updateProfile(db, userId, { displayName }) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  userModel.updateProfile(db, userId, { displayName });

  return getProfile(db, userId);
}

/**
 * Change a user's password (requires current password verification).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} data
 */
export async function changePassword(db, userId, { currentPassword, newPassword }) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const valid = await comparePassword(currentPassword, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  userModel.updatePassword(db, userId, passwordHash);

  auditModel.writeAudit(db, { action: 'user.change_password', actorId: userId, targetId: userId });
}

/**
 * Get all active sessions for a user, flagging the current session.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} currentSessionId
 */
export function getSessions(db, userId, currentSessionId) {
  const sessions = sessionModel.getUserSessions(db, userId);
  return sessions.map((s) => ({
    sessionId: s.session_id,
    ip: s.ip,
    ua: s.ua,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    current: s.session_id === currentSessionId,
  }));
}

/**
 * Revoke (delete) a specific session. Cannot revoke the current session.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} sessionId
 * @param {string} currentSessionId
 */
export function revokeSession(db, userId, sessionId, currentSessionId) {
  if (sessionId === currentSessionId) {
    throw new BadRequestError('Cannot revoke the current session. Use logout instead.');
  }

  const session = sessionModel.findSession(db, sessionId);
  if (!session || session.user_id !== userId) {
    throw new NotFoundError('Session not found');
  }

  sessionModel.deleteSession(db, sessionId);

  auditModel.writeAudit(db, { action: 'user.revoke_session', actorId: userId, detail: sessionId });
}

/**
 * Withdraw (soft-delete) a user account.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {{ password: string }} data
 */
export async function withdraw(db, userId, { password }) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Password is incorrect');
  }

  const tx = db.transaction(() => {
    userModel.updateStatus(db, userId, 'withdrawn');
    sessionModel.deleteUserSessions(db, userId);
  });
  tx();

  auditModel.writeAudit(db, { action: 'user.withdraw', actorId: userId, targetId: userId });
}
