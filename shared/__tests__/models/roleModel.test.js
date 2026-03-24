import { describe, it, expect, beforeEach } from 'vitest';
import * as roleModel from '../../models/roleModel.js';
import * as userModel from '../../models/userModel.js';

beforeEach(async () => {
  await userModel.createUser({ userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'A' });
});

describe('getRoles', () => {
  it('should return default member role for newly created user', async () => {
    const roles = await roleModel.getRoles('u_1');
    expect(roles).toEqual(['member']);
  });

  it('should return assigned roles', async () => {
    await roleModel.addRole('u_1', 'admin');
    const roles = await roleModel.getRoles('u_1');
    expect(roles).toContain('member');
    expect(roles).toContain('admin');
    expect(roles).toHaveLength(2);
  });
});

describe('addRole', () => {
  it('should add a role to a user', async () => {
    await roleModel.addRole('u_1', 'admin');
    const roles = await roleModel.getRoles('u_1');
    expect(roles).toContain('admin');
  });

  it('should ignore duplicate role (idempotent)', async () => {
    await roleModel.addRole('u_1', 'member');
    await roleModel.addRole('u_1', 'member');
    const roles = await roleModel.getRoles('u_1');
    const memberCount = roles.filter((r) => r === 'member').length;
    expect(memberCount).toBe(1);
  });
});

describe('removeRole', () => {
  it('should remove an existing role', async () => {
    await roleModel.addRole('u_1', 'admin');
    await roleModel.removeRole('u_1', 'admin');
    const roles = await roleModel.getRoles('u_1');
    expect(roles).not.toContain('admin');
    expect(roles).toContain('member');
  });

  it('should do nothing when removing a non-existent role', async () => {
    await roleModel.removeRole('u_1', 'admin');
    const roles = await roleModel.getRoles('u_1');
    expect(roles).toContain('member');
  });
});

describe('getUsersByRole', () => {
  it('should return user IDs with the given role', async () => {
    await userModel.createUser({ userId: 'u_2', email: 'b@c.com', passwordHash: 'h', displayName: 'B' });
    await roleModel.addRole('u_1', 'admin');
    await roleModel.addRole('u_2', 'admin');

    const admins = await roleModel.getUsersByRole('admin');
    expect(admins).toContain('u_1');
    expect(admins).toContain('u_2');
    expect(admins.length).toBeGreaterThanOrEqual(2);
  });
});
