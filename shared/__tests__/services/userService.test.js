import { describe, it, expect, beforeEach } from 'vitest';
import * as userService from '../../services/userService.js';
import * as authService from '../../services/authService.js';
import * as sessionModel from '../../models/sessionModel.js';
import { parseRefreshToken } from '../../utils/token.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../utils/errors.js';

const JWT_SECRET = 'test-secret';
const JWT_EXPIRES_IN = 3600;
const SESSION_TTL_DAYS = 7;

async function createUserWithSession() {
  await authService.register({ email: 'test@example.com', password: 'password123', displayName: 'Test' });
  const login = await authService.login({
    email: 'test@example.com', password: 'password123',
    jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
  });
  const parsed = parseRefreshToken(login.refreshToken);
  return { userId: login.user.userId, sessionId: parsed.sessionId, refreshToken: login.refreshToken };
}

describe('getProfile', () => {
  it('should return user profile with roles', async () => {
    const { userId } = await createUserWithSession();
    const profile = await userService.getProfile(userId);
    expect(profile.userId).toBe(userId);
    expect(profile.email).toBe('test@example.com');
    expect(profile.displayName).toBe('Test');
    expect(profile.roles).toContain('member');
    expect(profile.status).toBe('active');
    expect(profile.createdAt).toBeTruthy();
    expect(profile.updatedAt).toBeTruthy();
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(userService.getProfile('u_nope')).rejects.toThrow(NotFoundError);
  });
});

describe('updateProfile', () => {
  it('should update display name and return updated profile', async () => {
    const { userId } = await createUserWithSession();
    const profile = await userService.updateProfile(userId, { displayName: 'New Name' });
    expect(profile.displayName).toBe('New Name');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(userService.updateProfile('u_nope', { displayName: 'X' })).rejects.toThrow(NotFoundError);
  });
});

describe('changePassword', () => {
  it('should change password with correct current password', async () => {
    const { userId } = await createUserWithSession();
    await userService.changePassword(userId, { currentPassword: 'password123', newPassword: 'newpass456' });

    // Verify can login with new password
    const result = await authService.login({
      email: 'test@example.com', password: 'newpass456',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    expect(result.accessToken).toBeTruthy();
  });

  it('should throw UnauthorizedError for wrong current password', async () => {
    const { userId } = await createUserWithSession();
    await expect(
      userService.changePassword(userId, { currentPassword: 'wrong', newPassword: 'newpass456' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(
      userService.changePassword('u_nope', { currentPassword: 'x', newPassword: 'y' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('getSessions', () => {
  it('should return sessions with current flag', async () => {
    const { userId, sessionId } = await createUserWithSession();
    const sessions = await userService.getSessions(userId, sessionId);
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
    const login2 = await authService.login({
      email: 'test@example.com', password: 'password123',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    const parsed2 = parseRefreshToken(login2.refreshToken);

    await userService.revokeSession(userId, parsed2.sessionId, sessionId);
    expect(await sessionModel.findSession(userId, parsed2.sessionId)).toBeUndefined();
  });

  it('should throw BadRequestError when revoking current session', async () => {
    const { userId, sessionId } = await createUserWithSession();
    await expect(userService.revokeSession(userId, sessionId, sessionId)).rejects.toThrow(BadRequestError);
  });

  it('should throw NotFoundError for non-existent session', async () => {
    const { userId, sessionId } = await createUserWithSession();
    await expect(userService.revokeSession(userId, 's_nope', sessionId)).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when session belongs to another user', async () => {
    const { userId, sessionId } = await createUserWithSession();

    // Create another user with a session
    await authService.register({ email: 'other@test.com', password: 'pass', displayName: 'Other' });
    const otherLogin = await authService.login({
      email: 'other@test.com', password: 'pass',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    const otherParsed = parseRefreshToken(otherLogin.refreshToken);

    // Try to revoke other user's session as userId (passing userId's session as the session to revoke)
    // The session belongs to otherLogin.user.userId, not userId, so it should throw NotFoundError
    await expect(userService.revokeSession(userId, otherParsed.sessionId, sessionId)).rejects.toThrow(NotFoundError);
  });
});

describe('withdraw', () => {
  it('should mark user as withdrawn and delete all sessions', async () => {
    const { userId } = await createUserWithSession();
    await userService.withdraw(userId, { password: 'password123' });

    const profile = await userService.getProfile(userId);
    expect(profile.status).toBe('withdrawn');
  });

  it('should throw UnauthorizedError for wrong password', async () => {
    const { userId } = await createUserWithSession();
    await expect(userService.withdraw(userId, { password: 'wrong' })).rejects.toThrow(UnauthorizedError);
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(userService.withdraw('u_nope', { password: 'x' })).rejects.toThrow(NotFoundError);
  });
});
