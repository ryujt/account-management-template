import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  getInfo,
  updateInfo,
  changePassword,
  listSessions,
  revokeSession,
  withdraw,
} from '../../services/userService.mjs';
import {
  getItem,
  updateItem,
  getUserRoles,
  getUserSessions,
  deleteSession,
  deleteAllSessions,
  writeAuditLog,
} from '../../adapters/dynamodb.mjs';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockProfile = {
  userId: 'u_user1',
  email: 'user@test.com',
  displayName: 'Test User',
  passwordHash: bcrypt.hashSync('currentpw1', 4),
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('getInfo', () => {
  it('returns user info with roles', async () => {
    getItem.mockResolvedValue(mockProfile);
    getUserRoles.mockResolvedValue(['member']);

    const result = await getInfo('u_user1');

    expect(result).toEqual({
      userId: 'u_user1',
      email: 'user@test.com',
      displayName: 'Test User',
      roles: ['member'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(getItem).toHaveBeenCalledWith('USER#u_user1', 'PROFILE');
  });

  it('throws NotFoundError when user does not exist', async () => {
    getItem.mockResolvedValue(null);

    await expect(getInfo('u_missing')).rejects.toThrow(NotFoundError);
    await expect(getInfo('u_missing')).rejects.toThrow('User not found');
  });
});

describe('updateInfo', () => {
  it('updates display name', async () => {
    updateItem.mockResolvedValue(undefined);

    const result = await updateInfo('u_user1', { displayName: 'New Name' });

    expect(result).toEqual({ ok: true });
    expect(updateItem).toHaveBeenCalledWith(
      'USER#u_user1',
      'PROFILE',
      expect.objectContaining({ displayName: 'New Name' })
    );
  });
});

describe('changePassword', () => {
  it('succeeds with correct current password', async () => {
    getItem.mockResolvedValue(mockProfile);
    updateItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await changePassword('u_user1', {
      currentPassword: 'currentpw1',
      newPassword: 'newpass1234',
    });

    expect(result).toEqual({ ok: true });
    expect(updateItem).toHaveBeenCalledWith(
      'USER#u_user1',
      'PROFILE',
      expect.objectContaining({ passwordHash: expect.any(String) })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'password_change' })
    );
  });

  it('throws BadRequestError for wrong current password', async () => {
    getItem.mockResolvedValue(mockProfile);

    await expect(
      changePassword('u_user1', { currentPassword: 'wrongpw', newPassword: 'newpass12' })
    ).rejects.toThrow(BadRequestError);
    await expect(
      changePassword('u_user1', { currentPassword: 'wrongpw', newPassword: 'newpass12' })
    ).rejects.toThrow('Current password is incorrect');
  });

  it('throws NotFoundError when user not found', async () => {
    getItem.mockResolvedValue(null);

    await expect(
      changePassword('u_nope', { currentPassword: 'x', newPassword: 'y' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('listSessions', () => {
  it('returns active sessions with current flag', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
    const pastExpiry = Math.floor(Date.now() / 1000) - 100;

    getUserSessions.mockResolvedValue([
      {
        sessionId: 's_1',
        ip: '1.1.1.1',
        ua: 'Chrome',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: futureExpiry,
      },
      {
        sessionId: 's_2',
        ip: '2.2.2.2',
        ua: 'Firefox',
        createdAt: '2024-01-02T00:00:00.000Z',
        expiresAt: futureExpiry,
      },
      {
        sessionId: 's_expired',
        ip: '3.3.3.3',
        ua: 'Safari',
        createdAt: '2023-01-01T00:00:00.000Z',
        expiresAt: pastExpiry,
      },
    ]);

    const result = await listSessions('u_user1', 's_1');

    expect(result.sessions).toHaveLength(2); // expired one filtered out
    expect(result.sessions[0].current).toBe(true);
    expect(result.sessions[1].current).toBe(false);
    expect(result.sessions[0]).not.toHaveProperty('expiresAt');
  });

  it('returns empty array when no sessions', async () => {
    getUserSessions.mockResolvedValue([]);

    const result = await listSessions('u_user1', 's_x');
    expect(result.sessions).toEqual([]);
  });
});

describe('revokeSession', () => {
  it('deletes the specified session', async () => {
    deleteSession.mockResolvedValue(undefined);

    const result = await revokeSession('u_user1', 's_other', 's_current');

    expect(result).toEqual({ ok: true });
    expect(deleteSession).toHaveBeenCalledWith('u_user1', 's_other');
  });

  it('throws BadRequestError when trying to revoke current session', async () => {
    await expect(
      revokeSession('u_user1', 's_current', 's_current')
    ).rejects.toThrow(BadRequestError);
    await expect(
      revokeSession('u_user1', 's_current', 's_current')
    ).rejects.toThrow('Cannot revoke current session');
  });
});

describe('withdraw', () => {
  it('soft-deletes user and kills all sessions', async () => {
    getItem.mockResolvedValue(mockProfile);
    updateItem.mockResolvedValue(undefined);
    deleteAllSessions.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await withdraw('u_user1', { password: 'currentpw1' });

    expect(result).toEqual({ ok: true });
    expect(updateItem).toHaveBeenCalledWith(
      'USER#u_user1',
      'PROFILE',
      expect.objectContaining({ status: 'withdrawn' })
    );
    expect(deleteAllSessions).toHaveBeenCalledWith('u_user1');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'withdraw' })
    );
  });

  it('throws UnauthorizedError for wrong password', async () => {
    getItem.mockResolvedValue(mockProfile);

    await expect(
      withdraw('u_user1', { password: 'wrongpassword' })
    ).rejects.toThrow(UnauthorizedError);
    await expect(
      withdraw('u_user1', { password: 'wrongpassword' })
    ).rejects.toThrow('Invalid password');
  });

  it('throws NotFoundError when user not found', async () => {
    getItem.mockResolvedValue(null);

    await expect(
      withdraw('u_nope', { password: 'anything1' })
    ).rejects.toThrow(NotFoundError);
  });
});
