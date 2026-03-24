import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  verifyAccessToken,
  authenticate,
  requireRole,
} from '../../middleware/auth.mjs';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors.mjs';

describe('signAccessToken', () => {
  it('returns token string and expiresIn', () => {
    const result = signAccessToken({ sub: 'u_123', roles: ['member'], sid: 's_1' });
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('expiresIn');
    expect(typeof result.token).toBe('string');
    expect(result.expiresIn).toBe(900);
  });

  it('token can be decoded with the secret', () => {
    const { token } = signAccessToken({ sub: 'u_x', roles: ['admin'], sid: 's_2' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe('u_x');
    expect(decoded.roles).toEqual(['admin']);
    expect(decoded.sid).toBe('s_2');
  });
});

describe('verifyAccessToken', () => {
  it('returns decoded payload for valid token', () => {
    const { token } = signAccessToken({ sub: 'u_test', roles: ['member'], sid: 's_3' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('u_test');
  });

  it('throws UnauthorizedError for invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for expired token', () => {
    const token = jwt.sign(
      { sub: 'u_exp', roles: [], sid: 's_4' },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );
    expect(() => verifyAccessToken(token)).toThrow(UnauthorizedError);
  });
});

describe('authenticate', () => {
  it('extracts user from valid Bearer token', () => {
    const { token } = signAccessToken({ sub: 'u_auth', roles: ['member'], sid: 's_5' });
    const event = { headers: { authorization: `Bearer ${token}` } };
    const user = authenticate(event);
    expect(user.userId).toBe('u_auth');
    expect(user.roles).toEqual(['member']);
    expect(user.sessionId).toBe('s_5');
  });

  it('reads Authorization header (capital A)', () => {
    const { token } = signAccessToken({ sub: 'u_cap', roles: [], sid: 's_6' });
    const event = { headers: { Authorization: `Bearer ${token}` } };
    const user = authenticate(event);
    expect(user.userId).toBe('u_cap');
  });

  it('throws UnauthorizedError when no authorization header', () => {
    expect(() => authenticate({ headers: {} })).toThrow(UnauthorizedError);
    expect(() => authenticate({ headers: {} })).toThrow('Missing authorization header');
  });

  it('throws UnauthorizedError when header does not start with Bearer', () => {
    const event = { headers: { authorization: 'Basic abc' } };
    expect(() => authenticate(event)).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for invalid token in header', () => {
    const event = { headers: { authorization: 'Bearer garbage' } };
    expect(() => authenticate(event)).toThrow(UnauthorizedError);
  });

  it('handles missing headers gracefully', () => {
    expect(() => authenticate({})).toThrow(UnauthorizedError);
  });

  it('returns empty roles array when token has no roles', () => {
    const { token } = signAccessToken({ sub: 'u_nr', sid: 's_7' });
    const event = { headers: { authorization: `Bearer ${token}` } };
    const user = authenticate(event);
    // signAccessToken stores roles as undefined in payload, but authenticate defaults to []
    expect(Array.isArray(user.roles)).toBe(true);
  });
});

describe('requireRole', () => {
  it('does not throw when user has the required role', () => {
    expect(() => requireRole({ roles: ['admin', 'member'] }, 'admin')).not.toThrow();
  });

  it('throws ForbiddenError when user lacks the role', () => {
    expect(() => requireRole({ roles: ['member'] }, 'admin')).toThrow(ForbiddenError);
    expect(() => requireRole({ roles: ['member'] }, 'admin')).toThrow(
      'Insufficient permissions'
    );
  });

  it('throws ForbiddenError when roles array is empty', () => {
    expect(() => requireRole({ roles: [] }, 'admin')).toThrow(ForbiddenError);
  });
});
