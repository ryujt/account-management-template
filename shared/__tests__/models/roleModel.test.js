import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../setup.js';
import * as roleModel from '../../models/roleModel.js';
import * as userModel from '../../models/userModel.js';

let db;

beforeEach(() => {
  db = createTestDb();
  userModel.createUser(db, { userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'A' });
});

describe('getRoles', () => {
  it('should return empty array for user with no roles', () => {
    expect(roleModel.getRoles(db, 'u_1')).toEqual([]);
  });

  it('should return assigned roles', () => {
    roleModel.addRole(db, 'u_1', 'member');
    roleModel.addRole(db, 'u_1', 'admin');
    const roles = roleModel.getRoles(db, 'u_1');
    expect(roles).toContain('member');
    expect(roles).toContain('admin');
    expect(roles).toHaveLength(2);
  });
});

describe('addRole', () => {
  it('should add a role to a user', () => {
    roleModel.addRole(db, 'u_1', 'member');
    expect(roleModel.getRoles(db, 'u_1')).toEqual(['member']);
  });

  it('should ignore duplicate role (INSERT OR IGNORE)', () => {
    roleModel.addRole(db, 'u_1', 'member');
    roleModel.addRole(db, 'u_1', 'member');
    expect(roleModel.getRoles(db, 'u_1')).toEqual(['member']);
  });
});

describe('removeRole', () => {
  it('should remove an existing role', () => {
    roleModel.addRole(db, 'u_1', 'member');
    roleModel.addRole(db, 'u_1', 'admin');
    roleModel.removeRole(db, 'u_1', 'admin');
    expect(roleModel.getRoles(db, 'u_1')).toEqual(['member']);
  });

  it('should do nothing when removing a non-existent role', () => {
    roleModel.removeRole(db, 'u_1', 'admin');
    expect(roleModel.getRoles(db, 'u_1')).toEqual([]);
  });
});

describe('getUsersByRole', () => {
  it('should return user IDs with the given role', () => {
    userModel.createUser(db, { userId: 'u_2', email: 'b@c.com', passwordHash: 'h', displayName: 'B' });
    roleModel.addRole(db, 'u_1', 'admin');
    roleModel.addRole(db, 'u_2', 'admin');
    roleModel.addRole(db, 'u_1', 'member');

    const admins = roleModel.getUsersByRole(db, 'admin');
    expect(admins).toContain('u_1');
    expect(admins).toContain('u_2');
    expect(admins).toHaveLength(2);
  });
});
