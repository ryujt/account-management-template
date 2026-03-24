import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import * as userModel from '../models/userModel.js';
import * as roleModel from '../models/roleModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as auditModel from '../models/auditModel.js';

/**
 * List users with optional filters and cursor pagination.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ query?: string, role?: string, status?: string, cursor?: string, limit?: number }} opts
 */
export function listUsers(db, { query, role, status, cursor, limit = 20 } = {}) {
  const result = userModel.listUsers(db, { query, role, status, cursor, limit });

  // Attach roles to each user
  const users = result.users.map((u) => ({
    ...u,
    roles: roleModel.getRoles(db, u.user_id),
  }));

  return { users, nextCursor: result.nextCursor };
}

/**
 * Get detailed info about a single user (profile + roles + sessions).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function getUserDetail(db, userId) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const roles = roleModel.getRoles(db, userId);
  const sessions = sessionModel.getUserSessions(db, userId);

  return {
    userId: user.user_id,
    email: user.email,
    displayName: user.display_name,
    status: user.status,
    roles,
    sessions: sessions.map((s) => ({
      sessionId: s.session_id,
      ip: s.ip,
      ua: s.ua,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    })),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Update a user's status. If disabled or suspended, kill all their sessions.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} status
 * @param {string} adminUserId
 */
export function updateUserStatus(db, userId, status, adminUserId) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const tx = db.transaction(() => {
    userModel.updateStatus(db, userId, status);

    if (status === 'disabled' || status === 'suspended') {
      sessionModel.deleteUserSessions(db, userId);
    }
  });
  tx();

  auditModel.writeAudit(db, {
    action: 'admin.update_status',
    actorId: adminUserId,
    targetId: userId,
    detail: `status changed to ${status}`,
  });
}

/**
 * Add a role to a user.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} role
 * @param {string} adminUserId
 */
export function addRole(db, userId, role, adminUserId) {
  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  roleModel.addRole(db, userId, role);

  auditModel.writeAudit(db, {
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
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} role
 * @param {string} adminUserId
 */
export function removeRole(db, userId, role, adminUserId) {
  if (role === 'member') {
    throw new BadRequestError('Cannot remove the member role');
  }

  if (userId === adminUserId) {
    throw new ForbiddenError('Cannot demote yourself');
  }

  const user = userModel.findById(db, userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  roleModel.removeRole(db, userId, role);

  auditModel.writeAudit(db, {
    action: 'admin.remove_role',
    actorId: adminUserId,
    targetId: userId,
    detail: `role ${role} removed`,
  });
}
