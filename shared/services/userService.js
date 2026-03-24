import { comparePassword, hashPassword } from '../utils/password.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors.js';
import * as userModel from '../models/userModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as auditModel from '../models/auditModel.js';

/**
 * Get a user's profile including roles.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getProfile(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles ?? [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update a user's display name.
 *
 * @param {string} userId
 * @param {{ displayName: string }} fields
 * @returns {Promise<object>}
 */
export async function updateProfile(userId, { displayName }) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  await userModel.updateProfile(userId, { displayName });

  return getProfile(userId);
}

/**
 * Change a user's password (requires current password verification).
 *
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} data
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  await userModel.updatePassword(userId, passwordHash);

  await auditModel.writeAudit({ action: 'user.change_password', actorId: userId, targetId: userId });
}

/**
 * Get all active sessions for a user, flagging the current session.
 *
 * @param {string} userId
 * @param {string} currentSessionId
 * @returns {Promise<object[]>}
 */
export async function getSessions(userId, currentSessionId) {
  const sessions = await sessionModel.getUserSessions(userId);
  return sessions.map((s) => ({
    sessionId: s.sessionId,
    ip: s.ip,
    ua: s.ua,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    current: s.sessionId === currentSessionId,
  }));
}

/**
 * Revoke (delete) a specific session. Cannot revoke the current session.
 *
 * @param {string} userId
 * @param {string} sessionId
 * @param {string} currentSessionId
 */
export async function revokeSession(userId, sessionId, currentSessionId) {
  if (sessionId === currentSessionId) {
    throw new BadRequestError('Cannot revoke the current session. Use logout instead.');
  }

  const session = await sessionModel.findSession(userId, sessionId);
  if (!session || session.userId !== userId) {
    throw new NotFoundError('Session not found');
  }

  await sessionModel.deleteSession(userId, sessionId);

  await auditModel.writeAudit({ action: 'user.revoke_session', actorId: userId, detail: sessionId });
}

/**
 * Withdraw (soft-delete) a user account.
 *
 * @param {string} userId
 * @param {{ password: string }} data
 */
export async function withdraw(userId, { password }) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Password is incorrect');
  }

  await userModel.updateStatus(userId, 'withdrawn');
  await sessionModel.deleteUserSessions(userId);

  await auditModel.writeAudit({ action: 'user.withdraw', actorId: userId, targetId: userId });
}
