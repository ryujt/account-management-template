import { describe, it, expect, beforeEach } from 'vitest';
import * as sessionModel from '../../models/sessionModel.js';
import * as userModel from '../../models/userModel.js';

const futureTs = Math.floor(Date.now() / 1000) + 86400;
const pastTs = Math.floor(Date.now() / 1000) - 86400;

beforeEach(async () => {
  await userModel.createUser({ userId: 'u_1', email: 'a@b.com', passwordHash: 'h', displayName: 'A' });
});

describe('createSession + findSession', () => {
  it('should create and retrieve a session', async () => {
    await sessionModel.createSession({
      sessionId: 's_1',
      userId: 'u_1',
      refreshTokenHash: 'hash1',
      ip: '127.0.0.1',
      ua: 'TestAgent',
      expiresAt: futureTs,
    });

    const session = await sessionModel.findSession('u_1', 's_1');
    expect(session).toBeTruthy();
    expect(session.sessionId).toBe('s_1');
    expect(session.userId).toBe('u_1');
    expect(session.refreshTokenHash).toBe('hash1');
    expect(session.ip).toBe('127.0.0.1');
    expect(session.ua).toBe('TestAgent');
    expect(session.expiresAt).toBe(futureTs);
  });

  it('should return undefined for non-existent session', async () => {
    expect(await sessionModel.findSession('u_1', 's_nope')).toBeUndefined();
  });
});

describe('updateRefreshToken', () => {
  it('should update the token hash', async () => {
    await sessionModel.createSession({
      sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'old', expiresAt: futureTs,
    });
    await sessionModel.updateRefreshToken('u_1', 's_1', 'new_hash');

    const session = await sessionModel.findSession('u_1', 's_1');
    expect(session.refreshTokenHash).toBe('new_hash');
  });
});

describe('deleteSession', () => {
  it('should delete a specific session', async () => {
    await sessionModel.createSession({
      sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs,
    });
    await sessionModel.deleteSession('u_1', 's_1');
    expect(await sessionModel.findSession('u_1', 's_1')).toBeUndefined();
  });
});

describe('deleteUserSessions', () => {
  it('should delete all sessions for a user', async () => {
    await sessionModel.createSession({ sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    await sessionModel.createSession({ sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    await sessionModel.deleteUserSessions('u_1');

    expect(await sessionModel.findSession('u_1', 's_1')).toBeUndefined();
    expect(await sessionModel.findSession('u_1', 's_2')).toBeUndefined();
  });
});

describe('getUserSessions', () => {
  it('should return only non-expired sessions', async () => {
    await sessionModel.createSession({ sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    await sessionModel.createSession({ sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: pastTs });

    const sessions = await sessionModel.getUserSessions('u_1');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('s_1');
  });

  it('should return sessions for the user', async () => {
    await sessionModel.createSession({ sessionId: 's_1', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });
    await sessionModel.createSession({ sessionId: 's_2', userId: 'u_1', refreshTokenHash: 'h', expiresAt: futureTs });

    const sessions = await sessionModel.getUserSessions('u_1');
    expect(sessions).toHaveLength(2);
  });
});
