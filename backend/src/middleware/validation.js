const { body, validationResult } = require('express-validator');
const { BadRequestError } = require('../utils/errors');
const { validateEmail, validatePassword } = require('../utils/helpers');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    
    return next(new BadRequestError('Validation failed', errorDetails));
  }
  next();
}

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name is required and must be under 100 characters'),
  body('inviteCode')
    .optional()
    .isString()
    .withMessage('Invite code must be a string'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  handleValidationErrors
];

const updateProfileValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  handleValidationErrors
];

const updateUserValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('status')
    .optional()
    .isIn(['active', 'disabled'])
    .withMessage('Status must be active or disabled'),
  handleValidationErrors
];

const assignRoleValidation = [
  body('role')
    .isIn(['member', 'admin', 'manager'])
    .withMessage('Role must be member, admin, or manager'),
  handleValidationErrors
];

const createInviteValidation = [
  body('role')
    .isIn(['member', 'admin', 'manager'])
    .withMessage('Role must be member, admin, or manager'),
  body('expiresInHours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Expires in hours must be between 1 and 168'),
  handleValidationErrors
];

const redeemInviteValidation = [
  body('code')
    .notEmpty()
    .withMessage('Invite code is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name is required and must be under 100 characters'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  updateUserValidation,
  assignRoleValidation,
  createInviteValidation,
  redeemInviteValidation
};