const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Invalid input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .withMessage('Must be a valid email address')
  .normalizeEmail()
  .isLength({ max: 254 })
  .withMessage('Email must be less than 254 characters');

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

const displayNameValidation = body('display_name')
  .trim()
  .isLength({ min: 1, max: 255 })
  .withMessage('Display name must be between 1 and 255 characters')
  .matches(/^[a-zA-Z0-9\s\-_.]+$/)
  .withMessage('Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods');

// User validation schemas
const validateRegister = [
  emailValidation,
  passwordValidation,
  body('password_confirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  displayNameValidation,
  handleValidationErrors
];

const validateLogin = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('remember_me')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean'),
  handleValidationErrors
];

const validatePasswordReset = [
  emailValidation,
  handleValidationErrors
];

const validatePasswordResetConfirm = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid reset token format'),
  passwordValidation,
  body('password_confirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  handleValidationErrors
];

const validateEmailVerification = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid verification token format'),
  handleValidationErrors
];

const validateRefreshToken = [
  body('refresh_token')
    .optional()
    .isString()
    .withMessage('Refresh token must be a string'),
  handleValidationErrors
];

// Profile validation schemas
const validateProfileUpdate = [
  emailValidation.optional(),
  displayNameValidation.optional(),
  body('current_password')
    .optional()
    .notEmpty()
    .withMessage('Current password is required when updating email'),
  handleValidationErrors
];

const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  passwordValidation.withMessage('New password must meet security requirements'),
  body('password_confirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  handleValidationErrors
];

// Admin validation schemas
const validateUserSearch = [
  query('query')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Search query must be less than 255 characters'),
  query('role')
    .optional()
    .isString()
    .isIn(['member', 'admin'])
    .withMessage('Role must be either member or admin'),
  query('status')
    .optional()
    .isString()
    .isIn(['active', 'disabled'])
    .withMessage('Status must be either active or disabled'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),
  query('sort_by')
    .optional()
    .isString()
    .isIn(['email', 'display_name', 'created_at', 'updated_at'])
    .withMessage('Sort by must be one of: email, display_name, created_at, updated_at'),
  query('sort_order')
    .optional()
    .isString()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
  handleValidationErrors
];

const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  handleValidationErrors
];

const validateUserUpdate = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  emailValidation.optional(),
  displayNameValidation.optional(),
  body('status')
    .optional()
    .isString()
    .isIn(['active', 'disabled'])
    .withMessage('Status must be either active or disabled'),
  body('email_verified')
    .optional()
    .isBoolean()
    .withMessage('Email verified must be a boolean'),
  handleValidationErrors
];

const validateRoleAssignment = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  body('role_name')
    .notEmpty()
    .withMessage('Role name is required')
    .isString()
    .isIn(['member', 'admin'])
    .withMessage('Role must be either member or admin'),
  handleValidationErrors
];

const validateRoleRemoval = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  param('role')
    .notEmpty()
    .withMessage('Role is required')
    .isString()
    .isIn(['member', 'admin'])
    .withMessage('Role must be either member or admin'),
  handleValidationErrors
];

// Token validation schemas
const validateToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Token format is invalid'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidationErrors
];

// Custom validation helpers
const validateUniqueEmail = async (req, res, next) => {
  try {
    if (!req.body.email) {
      return next();
    }

    const { User } = require('../models');
    const existingUser = await User.findByEmail(req.body.email);
    
    // If updating, allow same email for same user
    if (existingUser && (!req.params.userId || existingUser.user_id !== parseInt(req.params.userId))) {
      return res.status(409).json({
        error: 'Validation error',
        message: 'Email address is already registered',
        details: [{
          field: 'email',
          message: 'Email address is already in use',
          value: req.body.email
        }]
      });
    }

    next();
  } catch (error) {
    console.error('Email uniqueness validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Validation failed'
    });
  }
};

const validateUserExists = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return next();
    }

    const { User } = require('../models');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    req.targetUser = user;
    next();
  } catch (error) {
    console.error('User existence validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Validation failed'
    });
  }
};

const validateRoleExists = async (req, res, next) => {
  try {
    const roleName = req.body.role_name || req.params.role;
    if (!roleName) {
      return next();
    }

    const { Role } = require('../models');
    const role = await Role.findByName(roleName);
    
    if (!role) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Role not found'
      });
    }

    next();
  } catch (error) {
    console.error('Role existence validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Validation failed'
    });
  }
};

module.exports = {
  // Handlers
  handleValidationErrors,
  
  // Auth validations
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateEmailVerification,
  validateRefreshToken,
  
  // Profile validations
  validateProfileUpdate,
  validatePasswordChange,
  
  // Admin validations
  validateUserSearch,
  validateUserId,
  validateUserUpdate,
  validateRoleAssignment,
  validateRoleRemoval,
  
  // Common validations
  validateToken,
  validatePagination,
  
  // Custom validators
  validateUniqueEmail,
  validateUserExists,
  validateRoleExists
};