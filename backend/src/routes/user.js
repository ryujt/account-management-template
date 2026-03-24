import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from 'account-management-shared/middleware/authenticate';
import { validate } from 'account-management-shared/middleware/validate';
import * as userService from 'account-management-shared/services/userService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// --- Validation schemas ---

const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const withdrawSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// --- Routes ---

router.get('/info', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const profile = userService.getProfile(db, req.user.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.patch('/info', validate(updateProfileSchema), (req, res, next) => {
  try {
    const db = req.app.get('db');
    const profile = userService.updateProfile(db, req.user.userId, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post('/changepw', validate(changePasswordSchema), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    await userService.changePassword(db, req.user.userId, req.body);
    res.json({ message: 'Password changed' });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const sessions = userService.getSessions(db, req.user.userId, req.user.sessionId);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:sessionId', (req, res, next) => {
  try {
    const db = req.app.get('db');
    userService.revokeSession(db, req.user.userId, req.params.sessionId, req.user.sessionId);
    res.json({ message: 'Session revoked' });
  } catch (err) {
    next(err);
  }
});

router.post('/withdraw', validate(withdrawSchema), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    await userService.withdraw(db, req.user.userId, req.body);
    res.json({ message: 'Account withdrawn' });
  } catch (err) {
    next(err);
  }
});

export default router;
