import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../setup.js';
import * as userModel from '../../models/userModel.js';

let db;

beforeEach(() => {
  db = createTestDb();
});

describe('createUser + findByEmail + findById', () => {
  it('should create a user and find by email', () => {
    userModel.createUser(db, {
      userId: 'u_1',
      email: 'test@example.com',
      passwordHash: 'hash123',
      displayName: 'Test User',
    });

    const user = userModel.findByEmail(db, 'test@example.com');
    expect(user).toBeTruthy();
    expect(user.user_id).toBe('u_1');
    expect(user.email).toBe('test@example.com');
    expect(user.display_name).toBe('Test User');
    expect(user.status).toBe('active');
  });

  it('should find by id', () => {
    userModel.createUser(db, {
      userId: 'u_1',
      email: 'test@example.com',
      passwordHash: 'hash123',
      displayName: 'Test User',
    });

    const user = userModel.findById(db, 'u_1');
    expect(user).toBeTruthy();
    expect(user.email).toBe('test@example.com');
  });

  it('should return undefined for non-existent email', () => {
    expect(userModel.findByEmail(db, 'nope@example.com')).toBeUndefined();
  });

  it('should return undefined for non-existent id', () => {
    expect(userModel.findById(db, 'u_nope')).toBeUndefined();
  });

  it('should enforce unique email', () => {
    userModel.createUser(db, { userId: 'u_1', email: 'dup@test.com', passwordHash: 'h', displayName: 'A' });
    expect(() => {
      userModel.createUser(db, { userId: 'u_2', email: 'dup@test.com', passwordHash: 'h', displayName: 'B' });
    }).toThrow();
  });
});

describe('updateProfile', () => {
  it('should update display name', () => {
    userModel.createUser(db, { userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'Old' });
    userModel.updateProfile(db, 'u_1', { displayName: 'New Name' });

    const user = userModel.findById(db, 'u_1');
    expect(user.display_name).toBe('New Name');
  });
});

describe('updatePassword', () => {
  it('should update password hash', () => {
    userModel.createUser(db, { userId: 'u_1', email: 'a@b.com', passwordHash: 'old_hash', displayName: 'A' });
    userModel.updatePassword(db, 'u_1', 'new_hash');

    const user = userModel.findById(db, 'u_1');
    expect(user.password_hash).toBe('new_hash');
  });
});

describe('updateStatus', () => {
  it('should update user status', () => {
    userModel.createUser(db, { userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'A' });
    userModel.updateStatus(db, 'u_1', 'disabled');

    const user = userModel.findById(db, 'u_1');
    expect(user.status).toBe('disabled');
  });
});

describe('listUsers', () => {
  beforeEach(() => {
    // Create users with staggered timestamps
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO users (user_id, email, password_hash, display_name, status, created_at)
        VALUES (?, ?, 'h', ?, 'active', datetime('2024-01-01', '+' || ? || ' days'))
      `).run(`u_${i}`, `user${i}@test.com`, `User ${i}`, i);
    }
  });

  it('should return all users ordered by created_at DESC', () => {
    const { users, nextCursor } = userModel.listUsers(db, { limit: 10 });
    expect(users).toHaveLength(5);
    expect(users[0].user_id).toBe('u_5');
    expect(nextCursor).toBeNull();
  });

  it('should paginate with limit', () => {
    const { users, nextCursor } = userModel.listUsers(db, { limit: 3 });
    expect(users).toHaveLength(3);
    expect(nextCursor).toBeTruthy();
  });

  it('should support cursor-based pagination', () => {
    const page1 = userModel.listUsers(db, { limit: 3 });
    const page2 = userModel.listUsers(db, { limit: 3, cursor: page1.nextCursor });
    expect(page2.users).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();
  });

  it('should filter by query (email)', () => {
    const { users } = userModel.listUsers(db, { query: 'user3' });
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('user3@test.com');
  });

  it('should filter by status', () => {
    userModel.updateStatus(db, 'u_2', 'disabled');
    const { users } = userModel.listUsers(db, { status: 'disabled' });
    expect(users).toHaveLength(1);
    expect(users[0].user_id).toBe('u_2');
  });

  it('should filter by role', () => {
    db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').run('u_1', 'admin');
    db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').run('u_3', 'admin');

    const { users } = userModel.listUsers(db, { role: 'admin' });
    expect(users).toHaveLength(2);
  });
});
