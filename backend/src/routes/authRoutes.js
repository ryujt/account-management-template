const express = require('express');
const authService = require('../services/authService');
const { authenticate, extractRefreshToken } = require('../middleware/auth');
const { 
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateInviteCode
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, inviteCode } = req.body;
  
  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    inviteCode
  });

  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      user: result.user
    }
  });
}));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await authService.login({ email, password }, req);

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    }
  });
}));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', extractRefreshToken, asyncHandler(async (req, res) => {
  const result = await authService.refresh({
    refreshToken: req.refreshToken
  });

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    }
  });
}));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  
  await authService.logout({
    userId: req.user.userId,
    refreshToken
  });

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', validateEmailVerification, asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  const result = await authService.verifyEmail({ token });

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', validateForgotPassword, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const result = await authService.forgotPassword({ email });

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post('/reset-password', validateResetPassword, asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  
  const result = await authService.resetPassword({ token, newPassword });

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   GET /api/v1/auth/invite/:inviteCode
 * @desc    Get invite details
 * @access  Public
 */
router.get('/invite/:inviteCode', validateInviteCode, asyncHandler(async (req, res) => {
  const { inviteCode } = req.params;
  
  const result = await authService.redeemInvite({ inviteCode });

  res.json({
    success: true,
    message: 'Invite details retrieved successfully',
    data: result.invite
  });
}));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'User retrieved successfully',
    data: {
      user: req.user
    }
  });
}));

module.exports = router;