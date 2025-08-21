const express = require('express');
const rateLimit = require('express-rate-limit');
const UserService = require('../services/userService');
const { authenticate, requireEmailVerification } = require('../middleware/auth');
const {
  validateProfileUpdate,
  validatePasswordChange,
  validateUniqueEmail
} = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting for user operations
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  }
});

const updateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit profile updates
  message: {
    error: 'Too many update requests',
    message: 'Please wait before updating again'
  }
});

// Apply authentication to all user routes
router.use(authenticate);
router.use(userLimiter);

// Get user profile
router.get('/profile',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const profile = await UserService.getProfile(userId);

    sendSuccess(res, { profile });
  })
);

// Update user profile
router.patch('/profile',
  updateLimiter,
  validateProfileUpdate,
  validateUniqueEmail,
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const updateData = req.body;

    const result = await UserService.updateProfile(userId, updateData);

    sendSuccess(res, result);
  })
);

// Change password
router.post('/password/change',
  validatePasswordChange,
  asyncHandler(async (req, res) => {
    const { current_password, password } = req.body;
    const userId = req.user.user_id;

    const result = await UserService.changePassword(userId, current_password, password);

    sendSuccess(res, null, result.message);
  })
);

// Get user sessions
router.get('/sessions',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const sessions = await UserService.getSessions(userId);

    sendSuccess(res, { sessions });
  })
);

// Revoke specific session
router.delete('/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.user_id;

    const result = await UserService.revokeSession(userId, sessionId);

    sendSuccess(res, null, result.message);
  })
);

// Revoke all other sessions (keep current)
router.post('/sessions/revoke-others',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const currentSessionId = req.tokenData?.sessionId;

    if (!currentSessionId) {
      return sendError(res, 'Cannot identify current session', 400);
    }

    const result = await UserService.revokeOtherSessions(userId, currentSessionId);

    sendSuccess(res, result);
  })
);

// Request email verification
router.post('/email/verify/request',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    // Check if email is already verified
    if (req.user.email_verified) {
      return sendError(res, 'Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    const result = await UserService.requestEmailVerification(userId);

    sendSuccess(res, null, result.message);
  })
);

// Get account statistics
router.get('/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const stats = await UserService.getAccountStats(userId);

    sendSuccess(res, { stats });
  })
);

// Get user activity summary
router.get('/activity',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const days = parseInt(req.query.days) || 30;

    // Validate days parameter
    if (days < 1 || days > 365) {
      return sendError(res, 'Days must be between 1 and 365', 400, 'INVALID_DAYS');
    }

    const activity = await UserService.getActivitySummary(userId, days);

    sendSuccess(res, { activity });
  })
);

// Export user data (GDPR compliance)
router.get('/export',
  requireEmailVerification,
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const exportData = await UserService.exportUserData(userId);

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);

    sendSuccess(res, { export: exportData });
  })
);

// Delete user account (soft delete)
router.delete('/account',
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user.user_id;

    // Require password confirmation for account deletion
    if (!password && req.user.password_hash) {
      return sendError(res, 'Password confirmation required for account deletion', 400, 'PASSWORD_REQUIRED');
    }

    const result = await UserService.deleteAccount(userId, password);

    sendSuccess(res, null, result.message);
  })
);

// Preferences endpoints (extendable for app-specific preferences)
router.get('/preferences',
  asyncHandler(async (req, res) => {
    // This is a placeholder for user preferences
    // In a real application, you might have a preferences table
    const preferences = {
      notifications: {
        email: true,
        push: false
      },
      privacy: {
        profile_visible: true,
        activity_visible: false
      },
      ui: {
        theme: 'light',
        language: 'en'
      }
    };

    sendSuccess(res, { preferences });
  })
);

router.patch('/preferences',
  updateLimiter,
  asyncHandler(async (req, res) => {
    const preferences = req.body;

    // Validate preferences structure (basic example)
    const allowedKeys = ['notifications', 'privacy', 'ui'];
    const invalidKeys = Object.keys(preferences).filter(key => !allowedKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return sendError(res, `Invalid preference keys: ${invalidKeys.join(', ')}`, 400, 'INVALID_PREFERENCES');
    }

    // In a real application, you would save these to a preferences table
    // For now, just return success
    sendSuccess(res, { preferences }, 'Preferences updated successfully');
  })
);

// Check if user has specific permission
router.get('/permissions/:permission',
  asyncHandler(async (req, res) => {
    const { permission } = req.params;
    const userId = req.user.user_id;

    const hasPermission = await UserService.hasPermission(userId, permission);

    sendSuccess(res, { 
      permission,
      has_permission: hasPermission
    });
  })
);

// Get user's roles
router.get('/roles',
  asyncHandler(async (req, res) => {
    const userRoles = req.userRoles.map(role => ({
      role_name: role.role_name,
      description: role.description,
      assigned_at: role.created_at
    }));

    sendSuccess(res, { roles: userRoles });
  })
);

// Notification settings (placeholder for future implementation)
router.get('/notifications',
  asyncHandler(async (req, res) => {
    // Placeholder for notification history/settings
    const notifications = {
      unread_count: 0,
      recent: [],
      settings: {
        email_notifications: true,
        security_alerts: true,
        marketing: false
      }
    };

    sendSuccess(res, { notifications });
  })
);

router.patch('/notifications/settings',
  updateLimiter,
  asyncHandler(async (req, res) => {
    const settings = req.body;

    // Validate settings
    const allowedSettings = ['email_notifications', 'security_alerts', 'marketing'];
    const validSettings = {};

    for (const [key, value] of Object.entries(settings)) {
      if (allowedSettings.includes(key) && typeof value === 'boolean') {
        validSettings[key] = value;
      }
    }

    if (Object.keys(validSettings).length === 0) {
      return sendError(res, 'No valid notification settings provided', 400, 'INVALID_SETTINGS');
    }

    // In a real application, save these settings to database
    sendSuccess(res, { settings: validSettings }, 'Notification settings updated');
  })
);

// User validation endpoint (for frontend use)
router.get('/validate',
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const validation = await UserService.validateUser(userId);

    sendSuccess(res, validation);
  })
);

// Health check for user service
router.get('/health',
  asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      user_id: req.user.user_id,
      services: {
        user_profile: 'operational',
        session_management: 'operational'
      }
    };

    sendSuccess(res, health);
  })
);

module.exports = router;