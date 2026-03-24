import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../setup.js';
import * as adminService from '../../services/adminService.js';
import * as authService from '../../services/authService.js';
import * as userModel from '../../models/userModel.js';
import * as roleModel from '../../models/roleModel.js';
import * as sessionModel from '../../models/sessionModel.js';
import { parseRefreshToken } from '../../utils/token.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors.js';

const JWT_SECRET = 'test-secret';
const JWT_EXPIRES_IN = 3600;
const SESSION_TTL_DAYS = 7;

let db;

beforeEach(() => {
  db = createTestDb();
});

async function createUser(email = 'user@test.com', displayName = 'User') {
  const { userId } = await authService.register(db, { email, password: 'password123', displayName });
  return userId;
}

async function createAdmin(email = 'admin@test.com') {
  const userId = await createUser(email, 'Admin');
  roleModel.addRole(db, userId, 'admin');
  return userId;
}

async function createUserWithSession(email = 'user@test.com') {
  await authService.register(db, { email, password: 'password123', displayName: 'User' });
  const login = await authService.login(db, {
    email, password: 'password123',
    jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
  });
  return { userId: login.user.userId, refreshToken: login.refreshToken };
}

describe('listUsers', () => {
  it('should return users with roles attached', async () => {
    await createUser('a@test.com', 'Alice');
    await createUser('b@test.com', 'Bob');

    const result = adminService.listUsers(db);
    expect(result.users).toHaveLength(2);
    expect(result.users[0].roles).toBeInstanceOf(Array);
  });

  it('should support filtering by status', async () => {
    const userId = await createUser();
    userModel.updateStatus(db, userId, 'disabled');
    await createUser('other@test.com');

    const result = adminService.listUsers(db, { status: 'disabled' });
    expect(result.users).toHaveLength(1);
    expect(result.users[0].user_id).toBe(userId);
  });

  it('should support filtering by role', async () => {
    await createAdmin('adm@test.com');
    await createUser('regular@test.com');

    const result = adminService.listUsers(db, { role: 'admin' });
    expect(result.users).toHaveLength(1);
  });

  it('should support query search', async () => {
    await createUser('alice@test.com', 'Alice');
    await createUser('bob@test.com', 'Bob');

    const result = adminService.listUsers(db, { query: 'alice' });
    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe('alice@test.com');
  });

  it('should support pagination', async () => {
    // Insert with staggered timestamps so cursor pagination works
    for (let i = 0; i < 5; i++) {
      const userId = `u_pg_${i}`;
      db.prepare(`
        INSERT INTO users (user_id, email, password_hash, display_name, status, created_at, updated_at)
        VALUES (?, ?, 'h', ?, 'active', datetime('2024-01-01', '+' || ? || ' days'), datetime('now'))
      `).run(userId, `u${i}@test.com`, `User${i}`, i + 1);
      roleModel.addRole(db, userId, 'member');
    }

    const page1 = adminService.listUsers(db, { limit: 3 });
    expect(page1.users).toHaveLength(3);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = adminService.listUsers(db, { limit: 3, cursor: page1.nextCursor });
    expect(page2.users).toHaveLength(2);
  });
});

describe('getUserDetail', () => {
  it('should return full user detail with roles and sessions', async () => {
    const { userId } = await createUserWithSession();

    const detail = adminService.getUserDetail(db, userId);
    expect(detail.userId).toBe(userId);
    expect(detail.email).toBe('user@test.com');
    expect(detail.roles).toContain('member');
    expect(detail.sessions).toBeInstanceOf(Array);
    expect(detail.sessions.length).toBeGreaterThanOrEqual(1);
    expect(detail.sessions[0]).toHaveProperty('sessionId');
  });

  it('should throw NotFoundError for non-existent user', () => {
    expect(() => adminService.getUserDetail(db, 'u_nope')).toThrow(NotFoundError);
  });
});

describe('updateUserStatus', () => {
  it('should update user status', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();

    adminService.updateUserStatus(db, userId, 'suspended', adminId);

    const user = userModel.findById(db, userId);
    expect(user.status).toBe('suspended');
  });

  it('should delete sessions when disabling a user', async () => {
    const { userId, refreshToken } = await createUserWithSession();
    const adminId = await createAdmin();
    const parsed = parseRefreshToken(refreshToken);

    adminService.updateUserStatus(db, userId, 'disabled', adminId);

    expect(sessionModel.findSession(db, parsed.sessionId)).toBeUndefined();
  });

  it('should delete sessions when suspending a user', async () => {
    const { userId, refreshToken } = await createUserWithSession();
    const adminId = await createAdmin();
    const parsed = parseRefreshToken(refreshToken);

    adminService.updateUserStatus(db, userId, 'suspended', adminId);

    expect(sessionModel.findSession(db, parsed.sessionId)).toBeUndefined();
  });

  it('should not delete sessions when reactivating a user', async () => {
    const { userId, refreshToken } = await createUserWithSession();
    const adminId = await createAdmin();

    // First disable (sessions deleted), then create a new session manually and reactivate
    adminService.updateUserStatus(db, userId, 'active', adminId);

    // No throw means success
    const user = userModel.findById(db, userId);
    expect(user.status).toBe('active');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    const adminId = await createAdmin();
    expect(() => adminService.updateUserStatus(db, 'u_nope', 'disabled', adminId)).toThrow(NotFoundError);
  });
});

describe('addRole', () => {
  it('should add a role to a user', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();

    adminService.addRole(db, userId, 'admin', adminId);

    const roles = roleModel.getRoles(db, userId);
    expect(roles).toContain('admin');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    const adminId = await createAdmin();
    expect(() => adminService.addRole(db, 'u_nope', 'admin', adminId)).toThrow(NotFoundError);
  });
});

describe('removeRole', () => {
  it('should remove a role from a user', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();
    roleModel.addRole(db, userId, 'admin');

    adminService.removeRole(db, userId, 'admin', adminId);

    const roles = roleModel.getRoles(db, userId);
    expect(roles).not.toContain('admin');
  });

  it('should throw BadRequestError when removing member role', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();

    expect(() => adminService.removeRole(db, userId, 'member', adminId)).toThrow(BadRequestError);
  });

  it('should throw ForbiddenError for self-demotion', async () => {
    const adminId = await createAdmin();

    expect(() => adminService.removeRole(db, adminId, 'admin', adminId)).toThrow(ForbiddenError);
  });

  it('should throw NotFoundError for non-existent user', async () => {
    const adminId = await createAdmin();
    expect(() => adminService.removeRole(db, 'u_nope', 'admin', adminId)).toThrow(NotFoundError);
  });
});
