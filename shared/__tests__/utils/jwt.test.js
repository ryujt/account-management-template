import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken, decodeToken } from '../../utils/jwt.js';

const SECRET = 'test-secret-key-for-jwt';

describe('signAccessToken', () => {
  it('should return a JWT string with three parts', () => {
    const token = signAccessToken(
      { userId: 'u_123', roles: ['member'], sessionId: 's_456' },
      SECRET,
      3600,
    );
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyAccessToken', () => {
  it('should decode a valid token', () => {
    const token = signAccessToken(
      { userId: 'u_123', roles: ['member', 'admin'], sessionId: 's_456' },
      SECRET,
      3600,
    );
    const decoded = verifyAccessToken(token, SECRET);
    expect(decoded.sub).toBe('u_123');
    expect(decoded.roles).toEqual(['member', 'admin']);
    expect(decoded.sid).toBe('s_456');
    expect(decoded.iat).toBeTypeOf('number');
    expect(decoded.exp).toBeTypeOf('number');
  });

  it('should throw for an invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here', SECRET)).toThrow();
  });

  it('should throw for a token signed with a different secret', () => {
    const token = signAccessToken(
      { userId: 'u_123', roles: ['member'], sessionId: 's_456' },
      SECRET,
      3600,
    );
    expect(() => verifyAccessToken(token, 'wrong-secret')).toThrow();
  });

  it('should throw for an expired token', () => {
    // Sign with 0 seconds expiry
    const token = signAccessToken(
      { userId: 'u_123', roles: ['member'], sessionId: 's_456' },
      SECRET,
      -1,
    );
    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });
});

describe('decodeToken', () => {
  it('should decode without verification', () => {
    const token = signAccessToken(
      { userId: 'u_123', roles: ['member'], sessionId: 's_456' },
      SECRET,
      3600,
    );
    const decoded = decodeToken(token);
    expect(decoded.sub).toBe('u_123');
    expect(decoded.roles).toEqual(['member']);
  });

  it('should return null for garbage input', () => {
    const result = decodeToken('not-a-jwt');
    expect(result).toBeNull();
  });
});
