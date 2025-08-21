const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, Role } = require('../models');

// Extract token from Authorization header or cookies
const extractToken = (req) => {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies as fallback
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

// Verify JWT token
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = verifyToken(token, config.jwt.accessTokenSecret);
    
    // Get user from database to ensure it still exists and is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Account is disabled'
      });
    }

    // Get user roles
    const userRoles = await user.getRoles();
    
    // Attach user and roles to request
    req.user = user;
    req.userRoles = userRoles;
    req.tokenData = decoded;

    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired'
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Optional authentication (for endpoints that work with or without auth)
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token, config.jwt.accessTokenSecret);
    const user = await User.findById(decoded.userId);
    
    if (user && user.status === 'active') {
      const userRoles = await user.getRoles();
      req.user = user;
      req.userRoles = userRoles;
      req.tokenData = decoded;
    }

    next();
  } catch (error) {
    // In optional auth, we don't fail on errors, just continue without user
    next();
  }
};

// Authorization middleware factory
const authorize = (requiredRoles = [], options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
      }

      // If no specific roles required, just check if user is authenticated
      if (requiredRoles.length === 0) {
        return next();
      }

      // Check if user has any of the required roles
      const userRoleNames = req.userRoles.map(role => role.role_name);
      const hasRole = requiredRoles.some(role => userRoleNames.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Authorization failed'
      });
    }
  };
};

// Admin only middleware
const requireAdmin = authorize(['admin']);

// Member or admin middleware
const requireMember = authorize(['member', 'admin']);

// Owner or admin middleware (for accessing own resources)
const requireOwnerOrAdmin = (getUserIdFromParams = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
      }

      const userRoleNames = req.userRoles.map(role => role.role_name);
      const isAdmin = userRoleNames.includes('admin');
      
      // Admin can access anything
      if (isAdmin) {
        return next();
      }

      // Regular users can only access their own resources
      const targetUserId = req.params[getUserIdFromParams] || req.body[getUserIdFromParams];
      if (req.user.user_id.toString() === targetUserId.toString()) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    } catch (error) {
      console.error('Owner/Admin authorization error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Authorization failed'
      });
    }
  };
};

// Email verification required middleware
const requireEmailVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (!req.user.email_verified) {
      return res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address to access this resource'
      });
    }

    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Verification check failed'
    });
  }
};

// Permission-based authorization
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
      }

      const userRoleNames = req.userRoles.map(role => role.role_name);
      const hasPermission = Role.hasPermission(userRoleNames, permission);

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Access denied',
          message: `Permission '${permission}' required`
        });
      }

      next();
    } catch (error) {
      console.error('Permission authorization error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Permission check failed'
      });
    }
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  requireAdmin,
  requireMember,
  requireOwnerOrAdmin,
  requireEmailVerification,
  requirePermission,
  extractToken,
  verifyToken
};