const express = require('express');
const rateLimit = require('express-rate-limit');
const AdminService = require('../services/adminService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  validateUserSearch,
  validateUserId,
  validateUserUpdate,
  validateRoleAssignment,
  validateRoleRemoval,
  validatePagination,
  validateUserExists,
  validateRoleExists
} = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendPaginatedResponse, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting for admin operations
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for admin operations
  message: {
    error: 'Too many admin requests',
    message: 'Please try again later'
  }
});

const strictAdminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // More restrictive for sensitive operations
  message: {
    error: 'Too many sensitive operations',
    message: 'Please wait before performing more sensitive actions'
  }
});

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(requireAdmin);
router.use(adminLimiter);

// Dashboard statistics
router.get('/dashboard/stats',
  asyncHandler(async (req, res) => {
    const stats = await AdminService.getDashboardStats();

    sendSuccess(res, { stats });
  })
);

// Get users with search, filter, and pagination
router.get('/users',
  validateUserSearch,
  asyncHandler(async (req, res) => {
    const options = {
      query: req.query.query || '',
      role: req.query.role || '',
      status: req.query.status || '',
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
      sortBy: req.query.sort_by || 'created_at',
      sortOrder: req.query.sort_order || 'DESC'
    };

    const result = await AdminService.getUsers(options);

    sendPaginatedResponse(res, result.users, result.pagination, 'Users retrieved successfully');
  })
);

// Get user by ID
router.get('/users/:userId',
  validateUserId,
  validateUserExists,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const userDetails = await AdminService.getUserById(parseInt(userId));

    sendSuccess(res, userDetails);
  })
);

// Update user (admin action)
router.patch('/users/:userId',
  strictAdminLimiter,
  validateUserId,
  validateUserUpdate,
  validateUserExists,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const updateData = req.body;
    const adminUserId = req.user.user_id;

    const result = await AdminService.updateUser(parseInt(userId), updateData, adminUserId);

    sendSuccess(res, result);
  })
);

// Assign role to user
router.post('/users/:userId/roles',
  strictAdminLimiter,
  validateUserId,
  validateRoleAssignment,
  validateUserExists,
  validateRoleExists,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role_name } = req.body;
    const adminUserId = req.user.user_id;

    const result = await AdminService.assignRole(parseInt(userId), role_name, adminUserId);

    sendSuccess(res, result, result.message);
  })
);

// Remove role from user
router.delete('/users/:userId/roles/:role',
  strictAdminLimiter,
  validateUserId,
  validateRoleRemoval,
  validateUserExists,
  validateRoleExists,
  asyncHandler(async (req, res) => {
    const { userId, role } = req.params;
    const adminUserId = req.user.user_id;

    const result = await AdminService.removeRole(parseInt(userId), role, adminUserId);

    sendSuccess(res, result, result.message);
  })
);

// Get all roles with statistics
router.get('/roles',
  asyncHandler(async (req, res) => {
    const result = await AdminService.getRoles();

    sendSuccess(res, result);
  })
);

// Force password reset for user
router.post('/users/:userId/password/force-reset',
  strictAdminLimiter,
  validateUserId,
  validateUserExists,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const adminUserId = req.user.user_id;

    const result = await AdminService.forcePasswordReset(parseInt(userId), adminUserId);

    sendSuccess(res, result, result.message);
  })
);

// Revoke all user sessions (admin action)
router.post('/users/:userId/sessions/revoke-all',
  strictAdminLimiter,
  validateUserId,
  validateUserExists,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const adminUserId = req.user.user_id;

    const result = await AdminService.revokeAllUserSessions(parseInt(userId), adminUserId);

    sendSuccess(res, result, result.message);
  })
);

// Get system activity log
router.get('/activity',
  validatePagination,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;

    const result = await AdminService.getActivityLog(limit, offset);

    sendPaginatedResponse(res, result.activities, result.pagination, 'Activity log retrieved successfully');
  })
);

// System cleanup (remove expired tokens, sessions, etc.)
router.post('/system/cleanup',
  strictAdminLimiter,
  asyncHandler(async (req, res) => {
    const result = await AdminService.performSystemCleanup();

    sendSuccess(res, result, result.message);
  })
);

// Export users data
router.get('/users/export',
  validateUserSearch,
  asyncHandler(async (req, res) => {
    const filters = {
      query: req.query.query || '',
      role: req.query.role || '',
      status: req.query.status || ''
    };

    const exportData = await AdminService.exportUsersData(filters);

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.json"`);

    sendSuccess(res, { export: exportData });
  })
);

// Advanced user search with more specific filters
router.post('/users/search',
  asyncHandler(async (req, res) => {
    const {
      email_pattern,
      name_pattern,
      roles = [],
      status = '',
      created_after,
      created_before,
      email_verified,
      limit = 20,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.body;

    // Build search query
    let query = '';
    if (email_pattern) query += `email:${email_pattern} `;
    if (name_pattern) query += `name:${name_pattern} `;

    const options = {
      query: query.trim(),
      role: roles.length === 1 ? roles[0] : '',
      status,
      limit,
      offset,
      sortBy: sort_by,
      sortOrder: sort_order
    };

    const result = await AdminService.getUsers(options);

    sendPaginatedResponse(res, result.users, result.pagination, 'Advanced search completed');
  })
);

// Get user statistics for specific user
router.get('/users/:userId/stats',
  validateUserId,
  validateUserExists,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const stats = await AdminService.getUserStats(parseInt(userId));

    sendSuccess(res, { user_id: parseInt(userId), stats });
  })
);

// Bulk operations on users
router.post('/users/bulk',
  strictAdminLimiter,
  asyncHandler(async (req, res) => {
    const { action, user_ids, data } = req.body;
    const adminUserId = req.user.user_id;

    // Validate input
    if (!action || !Array.isArray(user_ids) || user_ids.length === 0) {
      return sendError(res, 'Invalid bulk operation request', 400, 'INVALID_BULK_REQUEST');
    }

    const allowedActions = ['disable', 'enable', 'assign_role', 'remove_role'];
    if (!allowedActions.includes(action)) {
      return sendError(res, 'Invalid bulk action', 400, 'INVALID_BULK_ACTION');
    }

    const results = [];
    const errors = [];

    // Process each user
    for (const userId of user_ids) {
      try {
        let result;
        switch (action) {
          case 'disable':
            result = await AdminService.updateUser(userId, { status: 'disabled' }, adminUserId);
            break;
          case 'enable':
            result = await AdminService.updateUser(userId, { status: 'active' }, adminUserId);
            break;
          case 'assign_role':
            if (!data?.role_name) {
              throw new Error('Role name required for assign_role action');
            }
            result = await AdminService.assignRole(userId, data.role_name, adminUserId);
            break;
          case 'remove_role':
            if (!data?.role_name) {
              throw new Error('Role name required for remove_role action');
            }
            result = await AdminService.removeRole(userId, data.role_name, adminUserId);
            break;
        }
        results.push({ user_id: userId, success: true, result });
      } catch (error) {
        errors.push({ user_id: userId, success: false, error: error.message });
      }
    }

    const response = {
      action,
      total_requested: user_ids.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    };

    sendSuccess(res, response, `Bulk ${action} operation completed`);
  })
);

// System health check for admin
router.get('/system/health',
  asyncHandler(async (req, res) => {
    const stats = await AdminService.getDashboardStats();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        total_users: stats.users.total,
        active_users: stats.users.active,
        active_sessions: stats.sessions.active,
        database: 'connected'
      },
      services: {
        user_management: 'operational',
        session_management: 'operational',
        role_management: 'operational'
      }
    };

    sendSuccess(res, health);
  })
);

// Validate admin access (middleware test endpoint)
router.get('/validate',
  asyncHandler(async (req, res) => {
    const adminUserId = req.user.user_id;

    const validation = await AdminService.validateAdminAccess(adminUserId);

    sendSuccess(res, validation);
  })
);

// Admin settings (placeholder for future admin-specific settings)
router.get('/settings',
  asyncHandler(async (req, res) => {
    const settings = {
      system: {
        registration_enabled: true,
        email_verification_required: true,
        password_reset_enabled: true,
        oauth_enabled: !!process.env.GOOGLE_CLIENT_ID
      },
      security: {
        session_timeout: '7d',
        password_min_length: 8,
        max_login_attempts: 5
      },
      features: {
        user_export: true,
        bulk_operations: true,
        activity_logging: true
      }
    };

    sendSuccess(res, { settings });
  })
);

router.patch('/settings',
  strictAdminLimiter,
  asyncHandler(async (req, res) => {
    const updates = req.body;

    // In a real application, you would validate and save these settings
    // For now, just return the updated settings
    sendSuccess(res, { settings: updates }, 'Admin settings updated successfully');
  })
);

module.exports = router;