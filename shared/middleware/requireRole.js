import { ForbiddenError } from '../utils/errors.js';

/**
 * Factory that returns middleware requiring the authenticated user to hold
 * at least one of the specified roles.
 *
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    const userRoles = req.user?.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
