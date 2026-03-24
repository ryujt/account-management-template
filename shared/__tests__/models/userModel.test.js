import { describe, it, expect, beforeEach } from 'vitest';
import * as userModel from '../../models/userModel.js';

beforeEach(() => {
  // mockDocClient is cleared in vitest.setup.js beforeEach
});

describe('createUser + findByEmail + findById', () => {
  it('should create a user and find by email', async () => {
    await userModel.createUser({
      userId: 'u_1',
      email: 'test@example.com',
      passwordHash: 'hash123',
      displayName: 'Test User',
    });

    const user = await userModel.findByEmail('test@example.com');
    expect(user).toBeTruthy();
    expect(user.userId).toBe('u_1');
    expect(user.email).toBe('test@example.com');
    expect(user.displayName).toBe('Test User');
    expect(user.status).toBe('active');
    expect(user.roles).toContain('member');
  });

  it('should find by id', async () => {
    await userModel.createUser({
      userId: 'u_1',
      email: 'test@example.com',
      passwordHash: 'hash123',
      displayName: 'Test User',
    });

    const user = await userModel.findById('u_1');
    expect(user).toBeTruthy();
    expect(user.email).toBe('test@example.com');
  });

  it('should return undefined for non-existent email', async () => {
    expect(await userModel.findByEmail('nope@example.com')).toBeUndefined();
  });

  it('should return undefined for non-existent id', async () => {
    expect(await userModel.findById('u_nope')).toBeUndefined();
  });

  it('should enforce unique email', async () => {
    await userModel.createUser({ userId: 'u_1', email: 'dup@test.com', passwordHash: 'h', displayName: 'A' });
    await expect(
      userModel.createUser({ userId: 'u_2', email: 'dup@test.com', passwordHash: 'h', displayName: 'B' }),
    ).rejects.toThrow();
  });
});

describe('updateProfile', () => {
  it('should update display name', async () => {
    await userModel.createUser({ userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'Old' });
    await userModel.updateProfile('u_1', { displayName: 'New Name' });

    const user = await userModel.findById('u_1');
    expect(user.displayName).toBe('New Name');
  });
});

describe('updatePassword', () => {
  it('should update password hash', async () => {
    await userModel.createUser({ userId: 'u_1', email: 'a@b.com', passwordHash: 'old_hash', displayName: 'A' });
    await userModel.updatePassword('u_1', 'new_hash');

    const user = await userModel.findById('u_1');
    expect(user.passwordHash).toBe('new_hash');
  });
});

describe('updateStatus', () => {
  it('should update user status', async () => {
    await userModel.createUser({ userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'A' });
    await userModel.updateStatus('u_1', 'disabled');

    const user = await userModel.findById('u_1');
    expect(user.status).toBe('disabled');
  });
});

describe('listUsers', () => {
  beforeEach(async () => {
    // Create 5 users; stagger createdAt via direct mock table manipulation after put
    const { mockDocClient: client } = await import('../mockClient.js');
    for (let i = 1; i <= 5; i++) {
      await userModel.createUser({
        userId: `u_${i}`,
        email: `user${i}@test.com`,
        passwordHash: 'h',
        displayName: `User ${i}`,
      });
      // Patch createdAt/GSI4SK to stagger dates for ordering tests
      const date = `2024-01-0${i + 1}T00:00:00.000Z`;
      const table = client._getTable('TestTable');
      const itemKey = `USER#u_${i}\x00PROFILE`;
      const item = table.get(itemKey);
      if (item) {
        item.createdAt = date;
        item.updatedAt = date;
        item.GSI4SK = date;
      }
    }
  });

  it('should return all users ordered by createdAt DESC', async () => {
    const { users, nextCursor } = await userModel.listUsers({ limit: 10 });
    expect(users).toHaveLength(5);
    expect(nextCursor).toBeNull();
  });

  it('should paginate with limit', async () => {
    const { users } = await userModel.listUsers({ limit: 3 });
    expect(users).toHaveLength(3);
  });

  it('should filter by query (email)', async () => {
    const { users } = await userModel.listUsers({ query: 'user3' });
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('user3@test.com');
  });

  it('should filter by status', async () => {
    await userModel.updateStatus('u_2', 'disabled');
    const { users } = await userModel.listUsers({ status: 'disabled' });
    expect(users).toHaveLength(1);
    expect(users[0].userId).toBe('u_2');
  });

  it('should filter by role', async () => {
    // Add admin role to two users
    await userModel.updateProfile('u_1', { displayName: 'User 1' }); // ensure item exists in table
    const { mockDocClient: client } = await import('../mockClient.js');
    const table = client._getTable('TestTable');
    for (const uid of ['u_1', 'u_3']) {
      const item = table.get(`USER#${uid}\x00PROFILE`);
      if (item) {
        item.roles = ['member', 'admin'];
      }
    }

    const { users } = await userModel.listUsers({ role: 'admin' });
    expect(users).toHaveLength(2);
  });
});
