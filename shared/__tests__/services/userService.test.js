import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../setup.js';
import * as userService from '../../services/userService.js';
import * as authService from '../../services/authService.js';
import * as sessionModel from '../../models/sessionModel.js';
import { parseRefreshToken } from '../../utils/token.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../utils/errors.js';

const JWT_SECRET = 'test-secret';
const JWT_EXPIRES_IN = 3600;
const SESSION_TTL_DAYS = 7;

let db;

beforeEach(() => {
  db = createTestDb();
});

async function createUserWithSession() {
  await authService.register(db, { email: 'test@example.com', password: 'password123', displayName: 'Test' });
  const login = await authService.login(db, {
    email: 'test@example.com', password: 'password123',
    jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
  });
  const parsed = parseRefreshToken(login.refreshToken);
  return { userId: login.user.userId, sessionId: parsed.sessionId, refreshToken: login.refreshToken };
}

describe('getProfile', () => {
  it('should return user profile with roles', async () => {
    const { userId } = await createUserWithSession();
    const profile = userService.getProfile(db, userId);
    expect(profile.userId).toBe(userId);
    expect(profile.email).toBe('test@example.com');
    expect(profile.displayName).toBe('Test');
    expect(profile.roles).toContain('member');
    expect(profile.status).toBe('active');
    expect(profile.createdAt).toBeTruthy();
    expect(profile.updatedAt).toBeTruthy();
  });

  it('should throw NotFoundError for non-existent user', () => {
    expect(() => userService.getProfile(db, 'u_nope')).toThrow(NotFoundError);
  });
});

describe('updateProfile', () => {
  it('should update display name and return updated profile', async () => {
    const { userId } = await createUserWithSession();
    const profile = userService.updateProfile(db, userId, { displayName: 'New Name' });
    expect(profile.displayName).toBe('New Name');
  });

  it('should throw NotFoundError for non-existent user', () => {
    expect(() => userService.updateProfile(db, 'u_nope', { displayName: 'X' })).toThrow(NotFoundError);
  });
});

describe('changePassword', () => {
  it('should change password with correct current password', async () => {
    const { userId } = await createUserWithSession();
    await userService.changePassword(db, userId, { currentPassword: 'password123', newPassword: 'newpass456' });

    // Verify can login with new password
    const result = await authService.login(db, {
      email: 'test@example.com', password: 'newpass456',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    expect(result.accessToken).toBeTruthy();
  });

  it('should throw UnauthorizedError for wrong current password', async () => {
    const { userId } = await createUserWithSession();
    await expect(
      userService.changePassword(db, userId, { currentPassword: 'wrong', newPassword: 'newpass456' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(
      userService.changePassword(db, 'u_nope', { currentPassword: 'x', newPassword: 'y' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('getSessions', () => {
  it('should return sessions with current flag', async () => {
    const { userId, sessionId } = await createUserWithSession();
    const sessions = userService.getSessions(db, userId, sessionId);
    expect(sessions.length).toBeGreaterThanOrEqual(1);

    const current = sessions.find((s) => s.current);
    expect(current).toBeTruthy();
    expect(current.sessionId).toBe(sessionId);
  });
});

describe('revokeSession', () => {
  it('should revoke a non-current session', async () => {
    const { userId, sessionId } = await createUserWithSession();

    // Create a second session
    const login2 = await authService.login(db, {
      email: 'test@example.com', password: 'password123',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    const parsed2 = parseRefreshToken(login2.refreshToken);

    userService.revokeSession(db, userId, parsed2.sessionId, sessionId);
    expect(sessionModel.findSession(db, parsed2.sessionId)).toBeUndefined();
  });

  it('should throw BadRequestError when revoking current session', async () => {
    const { userId, sessionId } = await createUserWithSession();
    expect(() => userService.revokeSession(db, userId, sessionId, sessionId)).toThrow(BadRequestError);
  });

  it('should throw NotFoundError for non-existent session', async () => {
    const { userId, sessionId } = await createUserWithSession();
    expect(() => userService.revokeSession(db, userId, 's_nope', sessionId)).toThrow(NotFoundError);
  });

  it('should throw NotFoundError when session belongs to another user', async () => {
    const { userId, sessionId } = await createUserWithSession();

    // Create another user with a session
    await authService.register(db, { email: 'other@test.com', password: 'pass', displayName: 'Other' });
    const otherLogin = await authService.login(db, {
      email: 'other@test.com', password: 'pass',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    const otherParsed = parseRefreshToken(otherLogin.refreshToken);

    expect(() => userService.revokeSession(db, userId, otherParsed.sessionId, sessionId)).toThrow(NotFoundError);
  });
});

describe('withdraw', () => {
  it('should mark user as withdrawn and delete all sessions', async () => {
    const { userId } = await createUserWithSession();
    await userService.withdraw(db, userId, { password: 'password123' });

    const profile = userService.getProfile(db, userId);
    expect(profile.status).toBe('withdrawn');
  });

  it('should throw UnauthorizedError for wrong password', async () => {
    const { userId } = await createUserWithSession();
    await expect(userService.withdraw(db, userId, { password: 'wrong' })).rejects.toThrow(UnauthorizedError);
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(userService.withdraw(db, 'u_nope', { password: 'x' })).rejects.toThrow(NotFoundError);
  });
});
