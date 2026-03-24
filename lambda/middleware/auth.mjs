import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.mjs';

const JWT_SECRET = () => process.env.JWT_SECRET;

export function signAccessToken(payload) {
  const expiresIn = parseInt(process.env.JWT_EXPIRES_IN || '900', 10);
  return {
    token: jwt.sign(payload, JWT_SECRET(), { expiresIn }),
    expiresIn,
  };
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET());
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function authenticate(event) {
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing authorization header');
  }
  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);
  return {
    userId: decoded.sub,
    roles: decoded.roles || [],
    sessionId: decoded.sid,
  };
}

export function requireRole(user, role) {
  if (!user.roles.includes(role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}
