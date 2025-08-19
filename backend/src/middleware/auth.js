const authService = require('../services/authService');
const db = require('../adapters/database');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = authService.verifyAccessToken(token);
    
    // Get fresh user data from database
    const user = await db.getUserById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Attach user to request
    req.user = {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.roles,
      status: user.status,
      emailVerified: user.email_verified
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyAccessToken(token);
    
    const user = await db.getUserById(decoded.userId);
    if (user && user.status === 'active') {
      req.user = {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        status: user.status,
        emailVerified: user.email_verified
      };
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Require specific role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!req.user.roles || !req.user.roles.includes(requiredRole)) {
      return next(new ForbiddenError(`Role '${requiredRole}' required`));
    }

    next();
  };
};

/**
 * Require any of the specified roles
 */
const requireAnyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!req.user.roles || !req.user.roles.some(role => allowedRoles.includes(role))) {
      return next(new ForbiddenError(`One of the following roles required: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};

/**
 * Require admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Require user to be accessing their own resources or be admin
 */
const requireOwnerOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    
    // Allow if user is accessing their own resources
    if (req.user.userId === targetUserId) {
      return next();
    }

    // Allow if user is admin
    if (req.user.roles && req.user.roles.includes('admin')) {
      return next();
    }

    return next(new ForbiddenError('Access denied: can only access your own resources'));
  };
};

/**
 * Require email to be verified
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.emailVerified) {
    return next(new ForbiddenError('Email verification required'));
  }

  next();
};

/**
 * Extract refresh token from cookies or body
 */
const extractRefreshToken = (req, res, next) => {
  // Try to get refresh token from cookie first
  let refreshToken = req.cookies?.refreshToken;
  
  // Fallback to body
  if (!refreshToken && req.body) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    return next(new UnauthorizedError('Refresh token required'));
  }

  req.refreshToken = refreshToken;
  next();
};

/**
 * Rate limiting by user
 */
const rateLimitByUser = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId).filter(timestamp => timestamp > windowStart);
      userRequests.set(userId, requests);
    } else {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);

    if (requests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`
      });
    }

    requests.push(now);
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAnyRole,
  requireAdmin,
  requireOwnerOrAdmin,
  requireEmailVerified,
  extractRefreshToken,
  rateLimitByUser
};