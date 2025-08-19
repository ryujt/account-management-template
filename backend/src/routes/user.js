const express = require('express');
const userService = require('../services/userService');
const { authenticate } = require('../middleware/auth');
const { updateProfileValidation } = require('../middleware/validation');

const router = express.Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await userService.getProfile(req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authenticate, updateProfileValidation, async (req, res, next) => {
  try {
    const updates = req.body;
    const result = await userService.updateProfile(req.user.userId, updates);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/me/sessions', authenticate, async (req, res, next) => {
  try {
    const sessions = await userService.getUserSessions(req.user.userId);
    res.json({ items: sessions });
  } catch (error) {
    next(error);
  }
});

router.delete('/me/sessions/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await userService.revokeSession(req.user.userId, sessionId, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;