import { describe, it, expect, vi } from 'vitest';
import { authenticate } from '../../middleware/authenticate.js';
import { signAccessToken } from '../../utils/jwt.js';
import { UnauthorizedError } from '../../utils/errors.js';

const JWT_SECRET = 'test-jwt-secret';

function createReq(authHeader) {
  return {
    headers: { authorization: authHeader },
    app: { get: (key) => (key === 'jwtSecret' ? JWT_SECRET : undefined) },
  };
}

const res = {};

describe('authenticate middleware', () => {
  it('should attach req.user for a valid token', () => {
    const token = signAccessToken(
      { userId: 'u_1', roles: ['member'], sessionId: 's_1' },
      JWT_SECRET,
      3600,
    );
    const req = createReq(`Bearer ${token}`);
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      userId: 'u_1',
      roles: ['member'],
      sessionId: 's_1',
    });
  });

  it('should call next with UnauthorizedError when Authorization header is missing', () => {
    const req = createReq(undefined);
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next.mock.calls[0][0].message).toMatch(/Missing/);
  });

  it('should call next with UnauthorizedError for non-Bearer scheme', () => {
    const req = createReq('Basic abc123');
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with UnauthorizedError for an invalid token', () => {
    const req = createReq('Bearer invalid.token.here');
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next.mock.calls[0][0].message).toMatch(/Invalid or expired/);
  });

  it('should call next with UnauthorizedError for an expired token', () => {
    const token = signAccessToken(
      { userId: 'u_1', roles: ['member'], sessionId: 's_1' },
      JWT_SECRET,
      -1,
    );
    const req = createReq(`Bearer ${token}`);
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
