import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateUserId,
  generateSessionId,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  nowISO,
  epochSecondsFromDays,
  parseCookies,
  parseUserAgent,
} from '../../utils/helpers.mjs';

describe('generateUserId', () => {
  it('starts with u_ prefix', () => {
    const id = generateUserId();
    expect(id).toMatch(/^u_[a-f0-9]{32}$/);
  });

  it('generates unique ids', () => {
    const a = generateUserId();
    const b = generateUserId();
    expect(a).not.toBe(b);
  });
});

describe('generateSessionId', () => {
  it('starts with s_ prefix', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^s_[a-f0-9]{32}$/);
  });

  it('generates unique ids', () => {
    const a = generateSessionId();
    const b = generateSessionId();
    expect(a).not.toBe(b);
  });
});

describe('generateRefreshToken', () => {
  it('contains userId and sessionId as prefix', () => {
    const token = generateRefreshToken('u_abc', 's_xyz');
    expect(token.startsWith('u_abc.s_xyz.')).toBe(true);
  });

  it('has a random hex suffix after userId.sessionId', () => {
    const token = generateRefreshToken('u_x', 's_y');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('u_x');
    expect(parts[1]).toBe('s_y');
    expect(parts[2]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique tokens for same user and session', () => {
    const a = generateRefreshToken('u_same', 's_same');
    const b = generateRefreshToken('u_same', 's_same');
    expect(a).not.toBe(b);
  });
});

describe('hashRefreshToken', () => {
  it('returns a sha256 hex string', () => {
    const token = 'u_abc.s_def.deadbeef1234';
    const hash = hashRefreshToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent hashes for same token', () => {
    const token = 'u_x.s_y.randompart';
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('different tokens produce different hashes', () => {
    const a = hashRefreshToken('u_x.s_y.aaa');
    const b = hashRefreshToken('u_x.s_y.bbb');
    expect(a).not.toBe(b);
  });

  it('hashes only the random part (after last dot)', () => {
    // Same random part, different userId/sessionId => same hash
    const a = hashRefreshToken('u_one.s_one.samerandom');
    const b = hashRefreshToken('u_two.s_two.samerandom');
    expect(a).toBe(b);
  });

  it('handles token without dots by hashing the whole token', () => {
    const hash = hashRefreshToken('nodots');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('parseRefreshToken', () => {
  it('parses valid token into userId, sessionId, and random', () => {
    const result = parseRefreshToken('u_abc123.s_def456.randomhex');
    expect(result).toEqual({
      userId: 'u_abc123',
      sessionId: 's_def456',
      random: 'randomhex',
    });
  });

  it('returns null for token without enough parts (no dots)', () => {
    expect(parseRefreshToken('nodot')).toBeNull();
  });

  it('returns null for token with only one dot (two parts)', () => {
    expect(parseRefreshToken('one.two')).toBeNull();
  });

  it('handles extra dots in the random part', () => {
    const result = parseRefreshToken('u_abc.s_def.part1.part2');
    expect(result).toEqual({
      userId: 'u_abc',
      sessionId: 's_def',
      random: 'part1.part2',
    });
  });
});

describe('nowISO', () => {
  it('returns a valid ISO 8601 string', () => {
    const iso = nowISO();
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});

describe('epochSecondsFromDays', () => {
  it('returns a future epoch for positive days', () => {
    const now = Math.floor(Date.now() / 1000);
    const result = epochSecondsFromDays(7);
    expect(result).toBeGreaterThanOrEqual(now + 7 * 86400 - 2);
    expect(result).toBeLessThanOrEqual(now + 7 * 86400 + 2);
  });

  it('returns current epoch for zero days', () => {
    const now = Math.floor(Date.now() / 1000);
    const result = epochSecondsFromDays(0);
    expect(Math.abs(result - now)).toBeLessThanOrEqual(2);
  });
});

describe('parseCookies', () => {
  it('returns empty object for falsy input', () => {
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
  });

  it('parses single cookie', () => {
    expect(parseCookies('rt=abc123')).toEqual({ rt: 'abc123' });
  });

  it('parses multiple cookies', () => {
    const result = parseCookies('rt=abc; theme=dark; lang=en');
    expect(result).toEqual({ rt: 'abc', theme: 'dark', lang: 'en' });
  });

  it('handles URL-encoded values', () => {
    expect(parseCookies('name=hello%20world')).toEqual({ name: 'hello world' });
  });

  it('handles entries without = sign', () => {
    expect(parseCookies('noequals;rt=val')).toEqual({ rt: 'val' });
  });

  it('trims whitespace around keys and values', () => {
    expect(parseCookies('  rt = abc ')).toEqual({ rt: 'abc' });
  });
});

describe('parseUserAgent', () => {
  it('returns Unknown for falsy input', () => {
    expect(parseUserAgent(null)).toBe('Unknown');
    expect(parseUserAgent(undefined)).toBe('Unknown');
    expect(parseUserAgent('')).toBe('Unknown');
  });

  it('returns the UA string as-is when under 200 chars', () => {
    expect(parseUserAgent('Mozilla/5.0')).toBe('Mozilla/5.0');
  });

  it('truncates strings longer than 200 chars', () => {
    const long = 'A'.repeat(300);
    const result = parseUserAgent(long);
    expect(result.length).toBe(200);
  });
});
