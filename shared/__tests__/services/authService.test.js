import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../setup.js';
import * as authService from '../../services/authService.js';
import * as userModel from '../../models/userModel.js';
import * as roleModel from '../../models/roleModel.js';
import * as sessionModel from '../../models/sessionModel.js';
import { hashPassword } from '../../utils/password.js';
import { verifyAccessToken } from '../../utils/jwt.js';
import { parseRefreshToken, hashRefreshToken } from '../../utils/token.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';

const JWT_SECRET = 'test-secret';
const JWT_EXPIRES_IN = 3600;
const SESSION_TTL_DAYS = 7;

let db;

beforeEach(() => {
  db = createTestDb();
});

async function registerUser(email = 'test@example.com', password = 'password123') {
  return authService.register(db, { email, password, displayName: 'Test User' });
}

async function registerAndLogin(email = 'test@example.com', password = 'password123') {
  await registerUser(email, password);
  return authService.login(db, {
    email,
    password,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
    sessionTtlDays: SESSION_TTL_DAYS,
  });
}

describe('register', () => {
  it('should create a user with member role and return userId', async () => {
    const result = await registerUser();
    expect(result.userId).toMatch(/^u_/);

    const user = userModel.findByEmail(db, 'test@example.com');
    expect(user).toBeTruthy();
    expect(user.display_name).toBe('Test User');

    const roles = roleModel.getRoles(db, result.userId);
    expect(roles).toEqual(['member']);
  });

  it('should throw ConflictError for duplicate email', async () => {
    await registerUser();
    await expect(registerUser()).rejects.toThrow(ConflictError);
  });
});

describe('login', () => {
  it('should return accessToken, refreshToken, and user info', async () => {
    const result = await registerAndLogin();

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.roles).toContain('member');

    // Verify the access token is valid
    const decoded = verifyAccessToken(result.accessToken, JWT_SECRET);
    expect(decoded.sub).toBe(result.user.userId);

    // Verify refresh token format
    const parsed = parseRefreshToken(result.refreshToken);
    expect(parsed.userId).toBe(result.user.userId);
  });

  it('should create a session in the database', async () => {
    const result = await registerAndLogin();
    const parsed = parseRefreshToken(result.refreshToken);
    const session = sessionModel.findSession(db, parsed.sessionId);
    expect(session).toBeTruthy();
    expect(session.user_id).toBe(result.user.userId);
  });

  it('should throw UnauthorizedError for non-existent email', async () => {
    await expect(
      authService.login(db, {
        email: 'nope@test.com', password: 'x',
        jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for wrong password', async () => {
    await registerUser();
    await expect(
      authService.login(db, {
        email: 'test@example.com', password: 'wrong',
        jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for disabled user', async () => {
    const { userId } = await registerUser();
    userModel.updateStatus(db, userId, 'disabled');

    await expect(
      authService.login(db, {
        email: 'test@example.com', password: 'password123',
        jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe('refresh', () => {
  it('should return new accessToken and rotated refreshToken', async () => {
    const loginResult = await registerAndLogin();

    const result = authService.refresh(db, {
      refreshTokenCookie: loginResult.refreshToken,
      jwtSecret: JWT_SECRET,
      jwtExpiresIn: JWT_EXPIRES_IN,
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(loginResult.refreshToken);

    // Old refresh token should no longer work (hash was rotated)
    expect(() =>
      authService.refresh(db, {
        refreshTokenCookie: loginResult.refreshToken,
        jwtSecret: JWT_SECRET,
        jwtExpiresIn: JWT_EXPIRES_IN,
      }),
    ).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for missing refresh token', () => {
    expect(() =>
      authService.refresh(db, { refreshTokenCookie: '', jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN }),
    ).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for invalid format', () => {
    expect(() =>
      authService.refresh(db, { refreshTokenCookie: 'garbage', jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN }),
    ).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for expired session', async () => {
    const loginResult = await registerAndLogin();
    const parsed = parseRefreshToken(loginResult.refreshToken);

    // Manually set session to expired
    db.prepare('UPDATE sessions SET expires_at = ? WHERE session_id = ?')
      .run(Math.floor(Date.now() / 1000) - 1, parsed.sessionId);

    expect(() =>
      authService.refresh(db, {
        refreshTokenCookie: loginResult.refreshToken,
        jwtSecret: JWT_SECRET,
        jwtExpiresIn: JWT_EXPIRES_IN,
      }),
    ).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when user is no longer active', async () => {
    const loginResult = await registerAndLogin();
    userModel.updateStatus(db, loginResult.user.userId, 'disabled');

    expect(() =>
      authService.refresh(db, {
        refreshTokenCookie: loginResult.refreshToken,
        jwtSecret: JWT_SECRET,
        jwtExpiresIn: JWT_EXPIRES_IN,
      }),
    ).toThrow(UnauthorizedError);
  });
});

describe('logout', () => {
  it('should delete the session', async () => {
    const loginResult = await registerAndLogin();
    const parsed = parseRefreshToken(loginResult.refreshToken);

    authService.logout(db, { sessionId: parsed.sessionId });

    expect(sessionModel.findSession(db, parsed.sessionId)).toBeUndefined();
  });
});

describe('resetPassword', () => {
  it('should update password and kill all sessions', async () => {
    const loginResult = await registerAndLogin();

    await authService.resetPassword(db, { email: 'test@example.com', newPassword: 'newpass123' });

    // Old sessions should be gone
    const parsed = parseRefreshToken(loginResult.refreshToken);
    expect(sessionModel.findSession(db, parsed.sessionId)).toBeUndefined();

    // Should be able to login with new password
    const result = await authService.login(db, {
      email: 'test@example.com', password: 'newpass123',
      jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, sessionTtlDays: SESSION_TTL_DAYS,
    });
    expect(result.accessToken).toBeTruthy();
  });

  it('should silently return for non-existent email', async () => {
    await expect(
      authService.resetPassword(db, { email: 'nope@test.com', newPassword: 'newpass' }),
    ).resolves.toBeUndefined();
  });
});
