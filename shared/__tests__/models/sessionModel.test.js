import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../setup.js';
import * as sessionModel from '../../models/sessionModel.js';
import * as userModel from '../../models/userModel.js';

let db;
const futureTs = Math.floor(Date.now() / 1000) + 86400;
const pastTs = Math.floor(Date.now() / 1000) - 86400;

beforeEach(() => {
  db = createTestDb();
  userModel.createUser(db, { userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'A' });
});

describe('createSession + findSession', () => {
  it('should create and retrieve a session', () => {
    sessionModel.createSession(db, {
      sessionId: 's_1',
      userId: 'u_1',
      refreshTokenHash: 'hash1',
      ip: '127.0.0.1',
      ua: 'TestAgent',
      expiresAt: futureTs,
    });

    const session = sessionModel.findSession(db, 's_1');
    expect(session).toBeTruthy();
    expect(session.session_id).toBe('s_1');
    expect(session.user_id).toBe('u_1');
    expect(session.refresh_token_hash).toBe('hash1');
    expect(session.ip).toBe('127.0.0.1');
    expect(session.ua).toBe('TestAgent');
    expect(session.expires_at).toBe(futureTs);
  });

  it('should return undefined for non-existent session', () => {
    expect(sessionModel.findSession(db, 's_nope')).toBeUndefined();
  });
});

describe('updateRefreshToken', () => {
  it('should update the token hash', () => {
    sessionModel.createSession(db, {
      sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'old', expiresAt: futureTs,
    });
    sessionModel.updateRefreshToken(db, 's_1', 'new_hash');

    const session = sessionModel.findSession(db, 's_1');
    expect(session.refresh_token_hash).toBe('new_hash');
  });
});

describe('deleteSession', () => {
  it('should delete a specific session', () => {
    sessionModel.createSession(db, {
      sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs,
    });
    sessionModel.deleteSession(db, 's_1');
    expect(sessionModel.findSession(db, 's_1')).toBeUndefined();
  });
});

describe('deleteUserSessions', () => {
  it('should delete all sessions for a user', () => {
    sessionModel.createSession(db, { sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    sessionModel.createSession(db, { sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    sessionModel.deleteUserSessions(db, 'u_1');

    expect(sessionModel.findSession(db, 's_1')).toBeUndefined();
    expect(sessionModel.findSession(db, 's_2')).toBeUndefined();
  });
});

describe('getUserSessions', () => {
  it('should return only non-expired sessions', () => {
    sessionModel.createSession(db, { sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    sessionModel.createSession(db, { sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: pastTs });

    const sessions = sessionModel.getUserSessions(db, 'u_1');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].session_id).toBe('s_1');
  });

  it('should return sessions ordered by created_at DESC', () => {
    sessionModel.createSession(db, { sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    sessionModel.createSession(db, { sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });

    const sessions = sessionModel.getUserSessions(db, 'u_1');
    expect(sessions).toHaveLength(2);
  });
});

describe('cleanupExpired', () => {
  it('should remove expired sessions and return count', () => {
    sessionModel.createSession(db, { sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    sessionModel.createSession(db, { sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: pastTs });
    sessionModel.createSession(db, { sessionId: 's_3', userId: 'u_1', refreshTokenHash: 'h', expiresAt: pastTs });

    const count = sessionModel.cleanupExpired(db);
    expect(count).toBe(2);
    expect(sessionModel.findSession(db, 's_1')).toBeTruthy();
    expect(sessionModel.findSession(db, 's_2')).toBeUndefined();
  });
});
