import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listUsers,
  getUserDetail,
  updateUserStatus,
  addRole,
  removeRole,
} from '../../services/adminService.mjs';
import {
  getItem,
  updateItem,
  putItem,
  deleteItem,
  getUserRoles,
  getUserSessions,
  deleteAllSessions,
  query,
  scan,
  writeAuditLog,
} from '../../adapters/dynamodb.mjs';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../utils/errors.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockProfile = {
  userId: 'u_admin_target',
  email: 'target@test.com',
  displayName: 'Target User',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('listUsers', () => {
  it('scans for users without role filter', async () => {
    scan.mockResolvedValue({
      items: [
        {
          userId: 'u_1',
          email: 'a@t.com',
          displayName: 'A',
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      lastKey: null,
    });
    getUserRoles.mockResolvedValue(['member']);

    const result = await listUsers({ limit: 20 });

    expect(scan).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].roles).toEqual(['member']);
    expect(result.nextCursor).toBeNull();
  });

  it('queries GSI2 when role filter is provided', async () => {
    query.mockResolvedValue({
      items: [{ GSI2SK: 'USER#u_adm1', userId: 'u_adm1' }],
      lastKey: null,
    });
    getItem.mockResolvedValue({
      userId: 'u_adm1',
      email: 'admin@t.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    getUserRoles.mockResolvedValue(['member', 'admin']);

    const result = await listUsers({ role: 'admin', limit: 10 });

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROLE#admin' },
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].roles).toContain('admin');
  });

  it('returns nextCursor when lastKey is present', async () => {
    const lastKey = { PK: 'USER#u_x', SK: 'PROFILE' };
    scan.mockResolvedValue({
      items: [
        {
          userId: 'u_x',
          email: 'x@t.com',
          displayName: 'X',
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      lastKey,
    });
    getUserRoles.mockResolvedValue(['member']);

    const result = await listUsers({ limit: 1 });

    expect(result.nextCursor).toBeTruthy();
    // Should be base64url-decodable to the lastKey
    const decoded = JSON.parse(
      Buffer.from(result.nextCursor, 'base64url').toString('utf8')
    );
    expect(decoded).toEqual(lastKey);
  });

  it('throws BadRequestError for invalid cursor', async () => {
    await expect(
      listUsers({ cursor: 'not-valid-base64-json!!!' })
    ).rejects.toThrow(BadRequestError);
  });

  it('clamps limit between 1 and 100', async () => {
    scan.mockResolvedValue({ items: [], lastKey: null });

    await listUsers({ limit: 0 });
    const scanParams = scan.mock.calls[0][0];
    // limit 0 => parsed as NaN => default 20, then Limit = 20*3
    expect(scanParams.Limit).toBe(60);

    vi.clearAllMocks();
    scan.mockResolvedValue({ items: [], lastKey: null });

    await listUsers({ limit: 999 });
    const scanParams2 = scan.mock.calls[0][0];
    // limit 999 => clamped to 100, then Limit = 100*3
    expect(scanParams2.Limit).toBe(300);
  });

  it('filters by status in scan mode', async () => {
    scan.mockResolvedValue({ items: [], lastKey: null });

    await listUsers({ status: 'disabled' });

    const scanParams = scan.mock.calls[0][0];
    expect(scanParams.FilterExpression).toContain('#st = :status');
    expect(scanParams.ExpressionAttributeValues[':status']).toBe('disabled');
  });

  it('filters by query string in scan mode', async () => {
    scan.mockResolvedValue({ items: [], lastKey: null });

    await listUsers({ queryStr: 'alice' });

    const scanParams = scan.mock.calls[0][0];
    expect(scanParams.FilterExpression).toContain('contains(email, :q)');
    expect(scanParams.ExpressionAttributeValues[':q']).toBe('alice');
  });

  it('filters by status and query in role mode', async () => {
    query.mockResolvedValue({
      items: [
        { GSI2SK: 'USER#u_1', userId: 'u_1' },
        { GSI2SK: 'USER#u_2', userId: 'u_2' },
      ],
      lastKey: null,
    });

    const profile1 = {
      userId: 'u_1',
      email: 'alice@t.com',
      displayName: 'Alice',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const profile2 = {
      userId: 'u_2',
      email: 'bob@t.com',
      displayName: 'Bob',
      status: 'disabled',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    getItem.mockImplementation(async (pk) => {
      if (pk === 'USER#u_1') return profile1;
      if (pk === 'USER#u_2') return profile2;
      return null;
    });
    getUserRoles.mockResolvedValue(['member', 'admin']);

    // Filter: status=active, queryStr=alice
    const result = await listUsers({
      role: 'admin',
      status: 'active',
      queryStr: 'alice',
    });

    // Only Alice matches (active + name contains alice)
    expect(result.items).toHaveLength(1);
    expect(result.items[0].email).toBe('alice@t.com');
  });
});

describe('getUserDetail', () => {
  it('returns user profile and active sessions', async () => {
    getItem.mockResolvedValue(mockProfile);
    getUserRoles.mockResolvedValue(['member']);
    const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
    getUserSessions.mockResolvedValue([
      {
        sessionId: 's_1',
        ip: '1.1.1.1',
        ua: 'Chrome',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: futureExpiry,
      },
      {
        sessionId: 's_expired',
        ip: '2.2.2.2',
        ua: 'Old',
        createdAt: '2023-01-01T00:00:00.000Z',
        expiresAt: Math.floor(Date.now() / 1000) - 100,
      },
    ]);

    const result = await getUserDetail('u_admin_target');

    expect(result.user.userId).toBe('u_admin_target');
    expect(result.user.roles).toEqual(['member']);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sessionId).toBe('s_1');
  });

  it('throws NotFoundError when user not found', async () => {
    getItem.mockResolvedValue(null);

    await expect(getUserDetail('u_missing')).rejects.toThrow(NotFoundError);
  });
});

describe('updateUserStatus', () => {
  it('updates status and logs audit', async () => {
    getItem.mockResolvedValue(mockProfile);
    updateItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await updateUserStatus('u_admin_target', 'active', 'u_admin1');

    expect(result).toEqual({ ok: true });
    expect(updateItem).toHaveBeenCalledWith(
      'USER#u_admin_target',
      'PROFILE',
      expect.objectContaining({ status: 'active' })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'status_change',
        newStatus: 'active',
        adminUserId: 'u_admin1',
      })
    );
  });

  it('kills sessions when disabling', async () => {
    getItem.mockResolvedValue(mockProfile);
    updateItem.mockResolvedValue(undefined);
    deleteAllSessions.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    await updateUserStatus('u_admin_target', 'disabled', 'u_admin1');

    expect(deleteAllSessions).toHaveBeenCalledWith('u_admin_target');
  });

  it('kills sessions when suspending', async () => {
    getItem.mockResolvedValue(mockProfile);
    updateItem.mockResolvedValue(undefined);
    deleteAllSessions.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    await updateUserStatus('u_admin_target', 'suspended', 'u_admin1');

    expect(deleteAllSessions).toHaveBeenCalledWith('u_admin_target');
  });

  it('does NOT kill sessions when setting active', async () => {
    getItem.mockResolvedValue(mockProfile);
    updateItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    await updateUserStatus('u_admin_target', 'active', 'u_admin1');

    expect(deleteAllSessions).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when user not found', async () => {
    getItem.mockResolvedValue(null);

    await expect(
      updateUserStatus('u_nope', 'active', 'u_admin1')
    ).rejects.toThrow(NotFoundError);
  });

  it('throws BadRequestError for withdrawn account', async () => {
    getItem.mockResolvedValue({ ...mockProfile, status: 'withdrawn' });

    await expect(
      updateUserStatus('u_admin_target', 'active', 'u_admin1')
    ).rejects.toThrow(BadRequestError);
    await expect(
      updateUserStatus('u_admin_target', 'active', 'u_admin1')
    ).rejects.toThrow('Cannot modify a withdrawn account');
  });
});

describe('addRole', () => {
  it('adds a new role to user', async () => {
    getItem.mockImplementation(async (pk, sk) => {
      if (sk === 'PROFILE') return mockProfile;
      if (sk === 'ROLE#admin') return null; // doesn't have the role yet
      return null;
    });
    putItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await addRole('u_admin_target', 'admin', 'u_admin1');

    expect(result).toEqual({ ok: true });
    expect(putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        PK: 'USER#u_admin_target',
        SK: 'ROLE#admin',
        role: 'admin',
        GSI2PK: 'ROLE#admin',
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'role_add', role: 'admin' })
    );
  });

  it('throws ConflictError when role already exists', async () => {
    getItem.mockImplementation(async (pk, sk) => {
      if (sk === 'PROFILE') return mockProfile;
      if (sk === 'ROLE#admin') return { role: 'admin' }; // already has it
      return null;
    });

    await expect(
      addRole('u_admin_target', 'admin', 'u_admin1')
    ).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError when user not found', async () => {
    getItem.mockResolvedValue(null);

    await expect(addRole('u_nope', 'admin', 'u_admin1')).rejects.toThrow(NotFoundError);
  });
});

describe('removeRole', () => {
  it('removes an existing role', async () => {
    getItem.mockImplementation(async (pk, sk) => {
      if (sk === 'PROFILE') return mockProfile;
      if (sk === 'ROLE#admin') return { role: 'admin' };
      return null;
    });
    deleteItem.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);

    const result = await removeRole('u_admin_target', 'admin', 'u_admin1');

    expect(result).toEqual({ ok: true });
    expect(deleteItem).toHaveBeenCalledWith('USER#u_admin_target', 'ROLE#admin');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'role_remove', role: 'admin' })
    );
  });

  it('throws BadRequestError when trying to remove member role', async () => {
    getItem.mockResolvedValue(mockProfile);

    await expect(
      removeRole('u_admin_target', 'member', 'u_admin1')
    ).rejects.toThrow(BadRequestError);
    await expect(
      removeRole('u_admin_target', 'member', 'u_admin1')
    ).rejects.toThrow('Cannot remove the member role');
  });

  it('throws NotFoundError when user does not have the role', async () => {
    getItem.mockImplementation(async (pk, sk) => {
      if (sk === 'PROFILE') return mockProfile;
      if (sk === 'ROLE#admin') return null; // doesn't have it
      return null;
    });

    await expect(
      removeRole('u_admin_target', 'admin', 'u_admin1')
    ).rejects.toThrow(NotFoundError);
    await expect(
      removeRole('u_admin_target', 'admin', 'u_admin1')
    ).rejects.toThrow('User does not have role: admin');
  });

  it('throws NotFoundError when user not found', async () => {
    getItem.mockResolvedValue(null);

    await expect(
      removeRole('u_nope', 'admin', 'u_admin1')
    ).rejects.toThrow(NotFoundError);
  });
});
