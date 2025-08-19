const express = require('express');
const userService = require('../services/userService');
const { authenticate, requireEmailVerified } = require('../middleware/auth');
const {
  validateProfileUpdate,
  validatePasswordChange,
  validateSessionId,
  validateDeleteAccount
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const profile = await userService.getProfile(req.user.userId);

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: profile
    }
  });
}));

/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', validateProfileUpdate, asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.body;
  
  const updatedUser = await userService.updateProfile(req.user.userId, {
    firstName,
    lastName
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

/**
 * @route   POST /api/v1/user/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', requireEmailVerified, validatePasswordChange, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const result = await userService.changePassword(req.user.userId, {
    currentPassword,
    newPassword
  });

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   GET /api/v1/user/sessions
 * @desc    Get user sessions
 * @access  Private
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const sessions = await userService.getUserSessions(req.user.userId);

  res.json({
    success: true,
    message: 'Sessions retrieved successfully',
    data: {
      sessions
    }
  });
}));

/**
 * @route   DELETE /api/v1/user/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', validateSessionId, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const result = await userService.revokeSession(req.user.userId, sessionId);

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   DELETE /api/v1/user/sessions
 * @desc    Revoke all user sessions except current one
 * @access  Private
 */
router.delete('/sessions', asyncHandler(async (req, res) => {
  const { excludeCurrent } = req.query;
  
  // In a real implementation, you'd get the current session ID from the JWT or request
  // For now, we'll assume all sessions should be revoked
  const result = await userService.revokeAllSessions(
    req.user.userId,
    excludeCurrent === 'true' ? 'current-session-id' : null
  );

  res.json({
    success: true,
    message: result.message,
    data: {
      revokedCount: result.revokedCount
    }
  });
}));

/**
 * @route   GET /api/v1/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await userService.getUserStats(req.user.userId);

  res.json({
    success: true,
    message: 'User statistics retrieved successfully',
    data: stats
  });
}));

/**
 * @route   GET /api/v1/user/activity
 * @desc    Get user activity summary
 * @access  Private
 */
router.get('/activity', asyncHandler(async (req, res) => {
  const activity = await userService.getActivitySummary(req.user.userId);

  res.json({
    success: true,
    message: 'User activity retrieved successfully',
    data: activity
  });
}));

/**
 * @route   PUT /api/v1/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', asyncHandler(async (req, res) => {
  const preferences = req.body;
  
  const result = await userService.updatePreferences(req.user.userId, preferences);

  res.json({
    success: true,
    message: result.message,
    data: {
      preferences: result.preferences
    }
  });
}));

/**
 * @route   DELETE /api/v1/user/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', requireEmailVerified, validateDeleteAccount, asyncHandler(async (req, res) => {
  const { password } = req.body;
  
  const result = await userService.deleteAccount(req.user.userId, { password });

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: result.message
  });
}));

module.exports = router;