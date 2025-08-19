const express = require('express');
const adminService = require('../services/adminService');
const userService = require('../services/userService');
const { authenticate, authorize } = require('../middleware/auth');
const { updateUserValidation, assignRoleValidation, createInviteValidation } = require('../middleware/validation');

const router = express.Router();

router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { query, role, status, cursor, limit } = req.query;
    const result = await adminService.listUsers(
      query, 
      role, 
      status, 
      cursor, 
      limit ? parseInt(limit) : undefined
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await adminService.getUser(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:userId', authenticate, authorize('admin'), updateUserValidation, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const result = await adminService.updateUser(userId, updates, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/users/:userId/roles', authenticate, authorize('admin'), assignRoleValidation, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const result = await adminService.assignRole(userId, role, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:userId/roles/:role', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId, role } = req.params;
    const result = await adminService.revokeRole(userId, role, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:userId/sessions/:sessionId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;
    const result = await userService.revokeSession(userId, sessionId, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/invites', authenticate, authorize('admin'), createInviteValidation, async (req, res, next) => {
  try {
    const { role, expiresInHours } = req.body;
    const result = await adminService.createInvite(role, expiresInHours, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/invites', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await adminService.listInvites(req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/audit', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { actor, action, from, to, cursor, limit } = req.query;
    const result = await adminService.getAuditLogs(
      actor, 
      action, 
      from, 
      to, 
      cursor, 
      limit ? parseInt(limit) : undefined
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;