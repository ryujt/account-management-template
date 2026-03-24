import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Express middleware: extract Bearer token, verify JWT, attach req.user.
 *
 * Reads JWT secret from req.app.get('jwtSecret') or process.env.JWT_SECRET.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = header.slice(7);
  const secret = (req.app && req.app.get('jwtSecret')) || process.env.JWT_SECRET;

  try {
    const decoded = verifyAccessToken(token, secret);
    req.user = {
      userId: decoded.sub,
      roles: decoded.roles,
      sessionId: decoded.sid,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
