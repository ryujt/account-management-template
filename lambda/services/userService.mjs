import bcrypt from 'bcryptjs';
import {
  getItem,
  updateItem,
  getUserRoles,
  getUserSessions,
  deleteSession,
  deleteAllSessions,
  writeAuditLog,
} from '../adapters/dynamodb.mjs';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.mjs';
import { nowISO } from '../utils/helpers.mjs';

const SALT_ROUNDS = 12;

export async function getInfo(userId) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  const roles = await getUserRoles(userId);

  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    roles,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export async function updateInfo(userId, { displayName }) {
  await updateItem(`USER#${userId}`, 'PROFILE', {
    displayName,
    updatedAt: nowISO(),
  });
  return { ok: true };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new BadRequestError('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await updateItem(`USER#${userId}`, 'PROFILE', {
    passwordHash,
    updatedAt: nowISO(),
  });

  writeAuditLog({ action: 'password_change', userId });

  return { ok: true };
}

export async function listSessions(userId, currentSessionId) {
  const sessions = await getUserSessions(userId);
  const nowEpoch = Math.floor(Date.now() / 1000);

  return {
    sessions: sessions
      .filter((s) => s.expiresAt > nowEpoch)
      .map((s) => ({
        sessionId: s.sessionId,
        ip: s.ip,
        ua: s.ua,
        createdAt: s.createdAt,
        current: s.sessionId === currentSessionId,
      })),
  };
}

export async function revokeSession(userId, sessionId, currentSessionId) {
  if (sessionId === currentSessionId) {
    throw new BadRequestError('Cannot revoke current session. Use logout instead.');
  }
  await deleteSession(userId, sessionId);
  return { ok: true };
}

export async function withdraw(userId, { password }) {
  const user = await getItem(`USER#${userId}`, 'PROFILE');
  if (!user) throw new NotFoundError('User not found');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid password');
  }

  // Soft delete: set status to withdrawn
  await updateItem(`USER#${userId}`, 'PROFILE', {
    status: 'withdrawn',
    updatedAt: nowISO(),
  });

  // Kill all sessions
  await deleteAllSessions(userId);

  writeAuditLog({ action: 'withdraw', userId });

  return { ok: true };
}
