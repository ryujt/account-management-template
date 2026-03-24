import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  register,
  login,
  refresh,
  logout,
  resetPassword,
} from '../../services/authService.mjs';
import {
  getUserByEmail,
  getUserRoles,
  getItem,
  getSession,
  putItem,
  updateItem,
  deleteSession,
  deleteAllSessions,
  transactWrite,
  writeAuditLog,
} from '../../adapters/dynamodb.mjs';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../utils/errors.mjs';
import { hashRefreshToken } from '../../utils/helpers.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('register', () => {
  it('succeeds for new email', async () => {
    getUserByEmail.mockResolvedValue(null);
    transactWrite.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });

    expect(result).toHaveProperty('userId');
    expect(result.userId).toMatch(/^u_/);
    expect(result.email).toBe('test@example.com');
    expect(getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(transactWrite).toHaveBeenCalledOnce();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'register', email: 'test@example.com' })
    );
  });

  it('throws ConflictError for duplicate email', async () => {
    getUserByEmail.mockResolvedValue({ userId: 'u_existing', email: 'dup@example.com' });

    await expect(
      register({ email: 'dup@example.com', password: 'pass1234', displayName: 'Dup' })
    ).rejects.toThrow(ConflictError);
    await expect(
      register({ email: 'dup@example.com', password: 'pass1234', displayName: 'Dup' })
    ).rejects.toThrow('Email already registered');
  });

  it('hashes the password before storing', async () => {
    getUserByEmail.mockResolvedValue(null);
    transactWrite.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    await register({
      email: 'hash@test.com',
      password: 'mypassword',
      displayName: 'Hash',
    });

    const items = transactWrite.mock.calls[0][0];
    const profileItem = items[0].Put.Item;
    expect(profileItem.passwordHash).not.toBe('mypassword');
    expect(profileItem.passwordHash.startsWith('$2')).toBe(true);
  });

  it('creates three items in the transaction (profile, email ref, role)', async () => {
    getUserByEmail.mockResolvedValue(null);
    transactWrite.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    await register({
      email: 'three@test.com',
      password: 'pw123456',
      displayName: 'Three',
    });

    const items = transactWrite.mock.calls[0][0];
    expect(items).toHaveLength(3);
    expect(items[0].Put.Item.SK).toBe('PROFILE');
    expect(items[1].Put.Item.PK).toMatch(/^EMAIL#/);
    expect(items[2].Put.Item.SK).toBe('ROLE#member');
  });
});

describe('login', () => {
  const mockUser = {
    userId: 'u_login',
    email: 'login@test.com',
    displayName: 'Login User',
    passwordHash: bcrypt.hashSync('correct-password', 4),
    status: 'active',
  };

  it('succeeds with correct credentials', async () => {
    getUserByEmail.mockResolvedValue(mockUser);
    getUserRoles.mockResolvedValue(['member']);
    putItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await login({
      email: 'login@test.com',
      password: 'correct-password',
      ip: '1.2.3.4',
      ua: 'TestBrowser',
    });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('accessTokenExpiresIn');
    expect(result).toHaveProperty('sessionTtlSeconds');
    expect(result.user.email).toBe('login@test.com');
    expect(result.user.roles).toEqual(['member']);
    expect(putItem).toHaveBeenCalledOnce();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login', userId: 'u_login' })
    );
  });

  it('throws UnauthorizedError for non-existent email', async () => {
    getUserByEmail.mockResolvedValue(null);

    await expect(
      login({ email: 'no@test.com', password: 'pass1234' })
    ).rejects.toThrow(UnauthorizedError);
    await expect(
      login({ email: 'no@test.com', password: 'pass1234' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws UnauthorizedError for wrong password', async () => {
    getUserByEmail.mockResolvedValue(mockUser);

    await expect(
      login({ email: 'login@test.com', password: 'wrong-password' })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for disabled user', async () => {
    getUserByEmail.mockResolvedValue({ ...mockUser, status: 'disabled' });

    await expect(
      login({ email: 'login@test.com', password: 'correct-password' })
    ).rejects.toThrow('Account is not active');
  });

  it('throws UnauthorizedError for suspended user', async () => {
    getUserByEmail.mockResolvedValue({ ...mockUser, status: 'suspended' });

    await expect(
      login({ email: 'login@test.com', password: 'correct-password' })
    ).rejects.toThrow('Account is not active');
  });

  it('stores session with hashed refresh token', async () => {
    getUserByEmail.mockResolvedValue(mockUser);
    getUserRoles.mockResolvedValue(['member']);
    putItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await login({
      email: 'login@test.com',
      password: 'correct-password',
      ip: '1.2.3.4',
      ua: 'TestBrowser',
    });

    const sessionItem = putItem.mock.calls[0][0];
    expect(sessionItem.SK).toMatch(/^SESSION#/);
    expect(sessionItem.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionItem.ip).toBe('1.2.3.4');
    expect(sessionItem.ua).toBe('TestBrowser');
  });
});

describe('refresh', () => {
  it('succeeds with valid refresh token', async () => {
    const userId = 'u_ref';
    const sessionId = 's_refresh1';
    const tokenRandom = 'a'.repeat(64);
    const tokenRaw = `${userId}.${sessionId}.${tokenRandom}`;
    const tokenHash = hashRefreshToken(tokenRaw);

    getSession.mockResolvedValue({
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
      sessionId,
      userId,
      refreshTokenHash: tokenHash,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      ip: '1.1.1.1',
      ua: 'Old UA',
    });
    updateItem.mockResolvedValue(undefined);
    getUserRoles.mockResolvedValue(['member']);
    getItem.mockResolvedValue({
      userId,
      email: 'ref@test.com',
      displayName: 'Ref User',
    });

    const result = await refresh({ refreshTokenRaw: tokenRaw, ip: '2.2.2.2', ua: 'New UA' });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.refreshToken).not.toBe(tokenRaw); // rotated
    expect(result).toHaveProperty('user');
    expect(updateItem).toHaveBeenCalledOnce();
  });

  it('throws UnauthorizedError when no refresh token provided', async () => {
    await expect(refresh({ refreshTokenRaw: null })).rejects.toThrow(UnauthorizedError);
    await expect(refresh({ refreshTokenRaw: null })).rejects.toThrow('No refresh token');
  });

  it('throws UnauthorizedError for invalid format (not enough dots)', async () => {
    await expect(refresh({ refreshTokenRaw: 'nodot' })).rejects.toThrow(UnauthorizedError);
    await expect(refresh({ refreshTokenRaw: 'nodot' })).rejects.toThrow(
      'Invalid refresh token format'
    );
  });

  it('throws UnauthorizedError for two-part token (missing random)', async () => {
    await expect(refresh({ refreshTokenRaw: 'u_id.s_id' })).rejects.toThrow(
      'Invalid refresh token format'
    );
  });

  it('throws and deletes all sessions on token reuse (hash mismatch)', async () => {
    const tokenRaw = 'u_reuse.s_reuse.validrandom';

    getSession.mockResolvedValue({
      PK: 'USER#u_reuse',
      SK: 'SESSION#s_reuse',
      sessionId: 's_reuse',
      userId: 'u_reuse',
      refreshTokenHash: 'different_hash_than_expected',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    });
    deleteAllSessions.mockResolvedValue(undefined);

    await expect(refresh({ refreshTokenRaw: tokenRaw })).rejects.toThrow(UnauthorizedError);
    expect(deleteAllSessions).toHaveBeenCalledWith('u_reuse');
  });

  it('throws and deletes session when expired', async () => {
    const tokenRaw = 'u_exp.s_exp.randomdata';
    const tokenHash = hashRefreshToken(tokenRaw);

    getSession.mockResolvedValue({
      PK: 'USER#u_exp',
      SK: 'SESSION#s_exp',
      sessionId: 's_exp',
      userId: 'u_exp',
      refreshTokenHash: tokenHash,
      expiresAt: Math.floor(Date.now() / 1000) - 100, // past
    });
    deleteSession.mockResolvedValue(undefined);

    await expect(refresh({ refreshTokenRaw: tokenRaw })).rejects.toThrow('Session expired');
    expect(deleteSession).toHaveBeenCalledWith('u_exp', 's_exp');
  });

  it('throws when session not found', async () => {
    getSession.mockResolvedValue(null);

    await expect(
      refresh({ refreshTokenRaw: 'u_gone.s_gone.data' })
    ).rejects.toThrow('Session not found');
  });
});

describe('logout', () => {
  it('deletes session and writes audit log', async () => {
    deleteSession.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await logout({ userId: 'u_out', sessionId: 's_out' });

    expect(result).toEqual({ ok: true });
    expect(deleteSession).toHaveBeenCalledWith('u_out', 's_out');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'logout', userId: 'u_out', sessionId: 's_out' })
    );
  });
});

describe('resetPassword', () => {
  it('resets password and invalidates sessions for existing user', async () => {
    getItem.mockResolvedValue({
      userId: 'u_reset',
      email: 'reset@test.com',
      passwordHash: '$2a$04$old',
    });
    updateItem.mockResolvedValue(undefined);
    deleteAllSessions.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await resetPassword({
      userId: 'u_reset',
      newPassword: 'newpass1234',
    });

    expect(result).toEqual({ ok: true });
    expect(getItem).toHaveBeenCalledWith('USER#u_reset', 'PROFILE');
    expect(updateItem).toHaveBeenCalledWith(
      'USER#u_reset',
      'PROFILE',
      expect.objectContaining({ passwordHash: expect.any(String) })
    );
    expect(deleteAllSessions).toHaveBeenCalledWith('u_reset');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'password_reset' })
    );
  });

  it('throws NotFoundError for non-existent user', async () => {
    getItem.mockResolvedValue(null);

    await expect(
      resetPassword({ userId: 'u_nobody', newPassword: 'newpass1234' })
    ).rejects.toThrow(NotFoundError);
    await expect(
      resetPassword({ userId: 'u_nobody', newPassword: 'newpass1234' })
    ).rejects.toThrow('User not found');
  });
});
