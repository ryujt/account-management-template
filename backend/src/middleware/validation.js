const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { isValidPassword } = require('../utils/helpers');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    throw new ValidationError('Validation failed', errorDetails);
  }
  
  next();
};

/**
 * Custom password validator
 */
const passwordValidator = (value) => {
  if (!isValidPassword(value)) {
    throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
  }
  return true;
};

/**
 * Registration validation
 */
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .custom(passwordValidator),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),
  
  body('inviteCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid invite code'),
  
  handleValidationErrors
];

/**
 * Login validation
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .custom(passwordValidator),
  
  handleValidationErrors
];

/**
 * Password reset request validation
 */
const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  handleValidationErrors
];

/**
 * Password reset validation
 */
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .custom(passwordValidator),
  
  handleValidationErrors
];

/**
 * Email verification validation
 */
const validateEmailVerification = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required'),
  
  handleValidationErrors
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  handleValidationErrors
];

/**
 * User ID param validation
 */
const validateUserId = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format'),
  
  handleValidationErrors
];

/**
 * Session ID param validation
 */
const validateSessionId = [
  param('sessionId')
    .isUUID()
    .withMessage('Invalid session ID format'),
  
  handleValidationErrors
];

/**
 * Admin user update validation
 */
const validateAdminUserUpdate = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Invalid role specified'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status specified'),
  
  handleValidationErrors
];

/**
 * Invite creation validation
 */
const validateCreateInvite = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Invalid role specified'),
  
  handleValidationErrors
];

/**
 * Invite ID param validation
 */
const validateInviteId = [
  param('inviteId')
    .isUUID()
    .withMessage('Invalid invite ID format'),
  
  handleValidationErrors
];

/**
 * Invite code param validation
 */
const validateInviteCode = [
  param('inviteCode')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid invite code'),
  
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * User list filters validation
 */
const validateUserListFilters = [
  ...validatePagination,
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status filter'),
  
  query('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Invalid role filter'),
  
  handleValidationErrors
];

/**
 * Audit log filters validation
 */
const validateAuditLogFilters = [
  ...validatePagination,
  
  query('actorId')
    .optional()
    .isUUID()
    .withMessage('Invalid actor ID format'),
  
  query('action')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid action filter'),
  
  query('resourceType')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid resource type filter'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  handleValidationErrors
];

/**
 * Bulk role update validation
 */
const validateBulkRoleUpdate = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs must be a non-empty array'),
  
  body('userIds.*')
    .isUUID()
    .withMessage('Invalid user ID format'),
  
  body('roles')
    .isArray({ min: 1 })
    .withMessage('Roles must be a non-empty array'),
  
  body('roles.*')
    .isIn(['admin', 'member'])
    .withMessage('Invalid role specified'),
  
  handleValidationErrors
];

/**
 * Account deletion validation
 */
const validateDeleteAccount = [
  body('password')
    .notEmpty()
    .withMessage('Password is required for account deletion'),
  
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateProfileUpdate,
  validateUserId,
  validateSessionId,
  validateAdminUserUpdate,
  validateCreateInvite,
  validateInviteId,
  validateInviteCode,
  validatePagination,
  validateUserListFilters,
  validateAuditLogFilters,
  validateBulkRoleUpdate,
  validateDeleteAccount,
  handleValidationErrors
};