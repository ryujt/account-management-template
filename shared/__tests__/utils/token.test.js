import { describe, it, expect } from 'vitest';
import { generateRefreshToken, parseRefreshToken, hashRefreshToken } from '../../utils/token.js';

describe('generateRefreshToken', () => {
  it('should produce format userId.sessionId.random', () => {
    const token = generateRefreshToken('u_abc', 's_def');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('u_abc');
    expect(parts[1]).toBe('s_def');
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate unique tokens', () => {
    const t1 = generateRefreshToken('u_1', 's_1');
    const t2 = generateRefreshToken('u_1', 's_1');
    expect(t1).not.toBe(t2);
  });
});

describe('parseRefreshToken', () => {
  it('should extract userId, sessionId, and random', () => {
    const token = generateRefreshToken('u_abc', 's_def');
    const parsed = parseRefreshToken(token);
    expect(parsed.userId).toBe('u_abc');
    expect(parsed.sessionId).toBe('s_def');
    expect(parsed.random).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should throw for invalid format', () => {
    expect(() => parseRefreshToken('only-one-part')).toThrow('Invalid refresh token format');
    expect(() => parseRefreshToken('two.parts')).toThrow('Invalid refresh token format');
  });
});

describe('hashRefreshToken', () => {
  it('should return a hex SHA-256 hash', () => {
    const token = generateRefreshToken('u_1', 's_1');
    const hash = hashRefreshToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce consistent hashes for the same token', () => {
    const token = generateRefreshToken('u_1', 's_1');
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('should hash only the random part from full token', () => {
    const token = generateRefreshToken('u_1', 's_1');
    const random = token.split('.')[2];
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(random));
  });
});
