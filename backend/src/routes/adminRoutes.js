const express = require('express');
const adminService = require('../services/adminService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  validateAdminUserUpdate,
  validateCreateInvite,
  validateInviteId,
  validateUserId,
  validateUserListFilters,
  validateAuditLogFilters,
  validateBulkRoleUpdate
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();

  res.json({
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: stats
  });
}));

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with pagination and filters
 * @access  Private/Admin
 */
router.get('/users', validateUserListFilters, asyncHandler(async (req, res) => {
  const { page, limit, status, role } = req.query;
  
  const result = await adminService.listUsers({ page, limit, status, role });

  res.json({
    success: true,
    message: 'Users retrieved successfully',
    ...result
  });
}));

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get user details
 * @access  Private/Admin
 */
router.get('/users/:userId', validateUserId, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const userDetails = await adminService.getUserDetails(userId);

  res.json({
    success: true,
    message: 'User details retrieved successfully',
    data: userDetails
  });
}));

/**
 * @route   PUT /api/v1/admin/users/:userId
 * @desc    Update user
 * @access  Private/Admin
 */
router.put('/users/:userId', validateAdminUserUpdate, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, roles, status } = req.body;
  
  const updatedUser = await adminService.updateUser(
    req.user.userId,
    userId,
    { firstName, lastName, roles, status },
    req
  );

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

/**
 * @route   DELETE /api/v1/admin/users/:userId
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete('/users/:userId', validateUserId, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await adminService.deleteUser(req.user.userId, userId, req);

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   POST /api/v1/admin/users/bulk-update-roles
 * @desc    Bulk update user roles
 * @access  Private/Admin
 */
router.post('/users/bulk-update-roles', validateBulkRoleUpdate, asyncHandler(async (req, res) => {
  const { userIds, roles } = req.body;
  
  const result = await adminService.bulkUpdateRoles(req.user.userId, userIds, roles, req);

  res.json({
    success: true,
    message: result.message,
    data: {
      results: result.results,
      successCount: result.successCount,
      failureCount: result.failureCount
    }
  });
}));

/**
 * @route   GET /api/v1/admin/roles/summary
 * @desc    Get roles summary
 * @access  Private/Admin
 */
router.get('/roles/summary', asyncHandler(async (req, res) => {
  const rolesSummary = await adminService.getRolesSummary();

  res.json({
    success: true,
    message: 'Roles summary retrieved successfully',
    data: {
      roleCount: rolesSummary
    }
  });
}));

/**
 * @route   POST /api/v1/admin/invites
 * @desc    Create invitation
 * @access  Private/Admin
 */
router.post('/invites', validateCreateInvite, asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  
  const invite = await adminService.createInvite(
    req.user.userId,
    { email, role },
    req
  );

  res.status(201).json({
    success: true,
    message: 'Invitation created successfully',
    data: {
      invite
    }
  });
}));

/**
 * @route   GET /api/v1/admin/invites
 * @desc    List all invitations
 * @access  Private/Admin
 */
router.get('/invites', validateUserListFilters, asyncHandler(async (req, res) => {
  const { page, limit, status, createdBy } = req.query;
  
  const result = await adminService.listInvites({ page, limit, status, createdBy });

  res.json({
    success: true,
    message: 'Invitations retrieved successfully',
    ...result
  });
}));

/**
 * @route   DELETE /api/v1/admin/invites/:inviteId
 * @desc    Revoke invitation
 * @access  Private/Admin
 */
router.delete('/invites/:inviteId', validateInviteId, asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  
  const result = await adminService.revokeInvite(req.user.userId, inviteId, req);

  res.json({
    success: true,
    message: result.message
  });
}));

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private/Admin
 */
router.get('/audit-logs', validateAuditLogFilters, asyncHandler(async (req, res) => {
  const { page, limit, actorId, action, resourceType, startDate, endDate } = req.query;
  
  const result = await adminService.getAuditLogs({
    page,
    limit,
    actorId,
    action,
    resourceType,
    startDate,
    endDate
  });

  res.json({
    success: true,
    message: 'Audit logs retrieved successfully',
    ...result
  });
}));

module.exports = router;