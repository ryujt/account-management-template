import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import * as userModel from '../models/userModel.js';
import * as roleModel from '../models/roleModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as auditModel from '../models/auditModel.js';

/**
 * List users with optional filters and cursor pagination.
 * Roles are already embedded in the PROFILE item (denormalized).
 *
 * @param {{ query?: string, role?: string, status?: string, cursor?: string, limit?: number }} opts
 * @returns {Promise<{ users: object[], nextCursor: string|null }>}
 */
export async function listUsers({ query, role, status, cursor, limit = 20 } = {}) {
  const result = await userModel.listUsers({ query, role, status, cursor, limit });

  // Roles are already in the item - no N+1 query needed
  const users = result.users.map((u) => ({
    userId: u.userId,
    email: u.email,
    displayName: u.displayName,
    status: u.status,
    roles: u.roles ?? [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return { users, nextCursor: result.nextCursor };
}

/**
 * Get detailed info about a single user (profile + roles + sessions).
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getUserDetail(userId) {
  const [user, sessions] = await Promise.all([
    userModel.findById(userId),
    sessionModel.getUserSessions(userId),
  ]);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles ?? [],
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      ip: s.ip,
      ua: s.ua,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update a user's status. If disabled or suspended, kill all their sessions.
 *
 * @param {string} userId
 * @param {string} status
 * @param {string} adminUserId
 */
export async function updateUserStatus(userId, status, adminUserId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  await userModel.updateStatus(userId, status);

  if (status === 'disabled' || status === 'suspended') {
    await sessionModel.deleteUserSessions(userId);
  }

  await auditModel.writeAudit({
    action: 'admin.update_status',
    actorId: adminUserId,
    targetId: userId,
    detail: `status changed to ${status}`,
  });
}

/**
 * Add a role to a user.
 *
 * @param {string} userId
 * @param {string} role
 * @param {string} adminUserId
 */
export async function addRole(userId, role, adminUserId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  await roleModel.addRole(userId, role);

  await auditModel.writeAudit({
    action: 'admin.add_role',
    actorId: adminUserId,
    targetId: userId,
    detail: `role ${role} added`,
  });
}

/**
 * Remove a role from a user.
 * Prevents self-demotion and removal of the 'member' base role.
 *
 * @param {string} userId
 * @param {string} role
 * @param {string} adminUserId
 */
export async function removeRole(userId, role, adminUserId) {
  if (role === 'member') {
    throw new BadRequestError('Cannot remove the member role');
  }

  if (userId === adminUserId) {
    throw new ForbiddenError('Cannot demote yourself');
  }

  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  await roleModel.removeRole(userId, role);

  await auditModel.writeAudit({
    action: 'admin.remove_role',
    actorId: adminUserId,
    targetId: userId,
    detail: `role ${role} removed`,
  });
}
