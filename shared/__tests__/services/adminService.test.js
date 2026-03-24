import { describe, it, expect, beforeEach } from 'vitest';
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

async function createUser(email = 'user@test.com', displayName = 'User') {
  const { userId } = await authService.register({ email, password: 'password123', displayName });
  return userId;
}

async function createAdmin(email = 'admin@test.com') {
  const userId = await createUser(email, 'Admin');
  await roleModel.addRole(userId, 'admin');
  return userId;
}

async function createUserWithSession(email = 'user@test.com') {
  await authService.register({ email, password: 'password123', displayName: 'User' });
  const login = await authService.login({
    email, password: 'password123',
    jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
  });
  return { userId: login.user.userId, refreshToken: login.refreshToken };
}

describe('listUsers', () => {
  it('should return users with roles attached', async () => {
    await createUser('a@test.com', 'Alice');
    await createUser('b@test.com', 'Bob');

    const result = await adminService.listUsers();
    expect(result.users).toHaveLength(2);
    expect(result.users[0].roles).toBeInstanceOf(Array);
  });

  it('should support filtering by status', async () => {
    const userId = await createUser();
    await userModel.updateStatus(userId, 'disabled');
    await createUser('other@test.com');

    const result = await adminService.listUsers({ status: 'disabled' });
    expect(result.users).toHaveLength(1);
    expect(result.users[0].userId).toBe(userId);
  });

  it('should support filtering by role', async () => {
    await createAdmin('adm@test.com');
    await createUser('regular@test.com');

    const result = await adminService.listUsers({ role: 'admin' });
    expect(result.users).toHaveLength(1);
  });

  it('should support query search', async () => {
    await createUser('alice@test.com', 'Alice');
    await createUser('bob@test.com', 'Bob');

    const result = await adminService.listUsers({ query: 'alice' });
    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe('alice@test.com');
  });
});

describe('getUserDetail', () => {
  it('should return full user detail with roles and sessions', async () => {
    const { userId } = await createUserWithSession();

    const detail = await adminService.getUserDetail(userId);
    expect(detail.userId).toBe(userId);
    expect(detail.email).toBe('user@test.com');
    expect(detail.roles).toContain('member');
    expect(detail.sessions).toBeInstanceOf(Array);
    expect(detail.sessions.length).toBeGreaterThanOrEqual(1);
    expect(detail.sessions[0]).toHaveProperty('sessionId');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(adminService.getUserDetail('u_nope')).rejects.toThrow(NotFoundError);
  });
});

describe('updateUserStatus', () => {
  it('should update user status', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();

    await adminService.updateUserStatus(userId, 'suspended', adminId);

    const user = await userModel.findById(userId);
    expect(user.status).toBe('suspended');
  });

  it('should delete sessions when disabling a user', async () => {
    const { userId, refreshToken } = await createUserWithSession();
    const adminId = await createAdmin();
    const parsed = parseRefreshToken(refreshToken);

    await adminService.updateUserStatus(userId, 'disabled', adminId);

    expect(await sessionModel.findSession(userId, parsed.sessionId)).toBeUndefined();
  });

  it('should delete sessions when suspending a user', async () => {
    const { userId, refreshToken } = await createUserWithSession();
    const adminId = await createAdmin();
    const parsed = parseRefreshToken(refreshToken);

    await adminService.updateUserStatus(userId, 'suspended', adminId);

    expect(await sessionModel.findSession(userId, parsed.sessionId)).toBeUndefined();
  });

  it('should not delete sessions when reactivating a user', async () => {
    const { userId } = await createUserWithSession();
    const adminId = await createAdmin();

    await adminService.updateUserStatus(userId, 'active', adminId);

    const user = await userModel.findById(userId);
    expect(user.status).toBe('active');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    const adminId = await createAdmin();
    await expect(adminService.updateUserStatus('u_nope', 'disabled', adminId)).rejects.toThrow(NotFoundError);
  });
});

describe('addRole', () => {
  it('should add a role to a user', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();

    await adminService.addRole(userId, 'admin', adminId);

    const roles = await roleModel.getRoles(userId);
    expect(roles).toContain('admin');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    const adminId = await createAdmin();
    await expect(adminService.addRole('u_nope', 'admin', adminId)).rejects.toThrow(NotFoundError);
  });
});

describe('removeRole', () => {
  it('should remove a role from a user', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();
    await roleModel.addRole(userId, 'admin');

    await adminService.removeRole(userId, 'admin', adminId);

    const roles = await roleModel.getRoles(userId);
    expect(roles).not.toContain('admin');
  });

  it('should throw BadRequestError when removing member role', async () => {
    const userId = await createUser();
    const adminId = await createAdmin();

    await expect(adminService.removeRole(userId, 'member', adminId)).rejects.toThrow(BadRequestError);
  });

  it('should throw ForbiddenError for self-demotion', async () => {
    const adminId = await createAdmin();

    await expect(adminService.removeRole(adminId, 'admin', adminId)).rejects.toThrow(ForbiddenError);
  });

  it('should throw NotFoundError for non-existent user', async () => {
    const adminId = await createAdmin();
    await expect(adminService.removeRole('u_nope', 'admin', adminId)).rejects.toThrow(NotFoundError);
  });
});
