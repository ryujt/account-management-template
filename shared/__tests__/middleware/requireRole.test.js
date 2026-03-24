import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../../middleware/requireRole.js';
import { ForbiddenError } from '../../utils/errors.js';

describe('requireRole middleware', () => {
  it('should call next() when user has the required role', () => {
    const middleware = requireRole('admin');
    const req = { user: { roles: ['member', 'admin'] } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with ForbiddenError when user lacks the role', () => {
    const middleware = requireRole('admin');
    const req = { user: { roles: ['member'] } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should allow any of multiple roles', () => {
    const middleware = requireRole('admin', 'superadmin');
    const req = { user: { roles: ['superadmin'] } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle missing user gracefully', () => {
    const middleware = requireRole('admin');
    const req = {};
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should handle user with no roles array', () => {
    const middleware = requireRole('member');
    const req = { user: {} };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
