import { Router } from 'express';
import { z } from 'zod';
import { validate } from 'account-management-shared/middleware/validate';
import { authenticate } from 'account-management-shared/middleware/authenticate';
import * as authService from 'account-management-shared/services/authService';
import * as userModel from 'account-management-shared/models/userModel';

const router = Router();

// --- Validation schemas ---

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// --- Cookie helpers ---

function setRefreshTokenCookie(res, token, sessionTtlDays) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/auth',
    maxAge: sessionTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('rt', { path: '/auth' });
}

// --- Routes ---

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const result = await authService.register(db, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const jwtSecret = req.app.get('jwtSecret');
    const jwtExpiresIn = req.app.get('jwtExpiresIn');
    const sessionTtlDays = req.app.get('sessionTtlDays');

    const result = await authService.login(db, {
      ...req.body,
      ip: req.ip,
      ua: req.get('user-agent'),
      jwtSecret,
      jwtExpiresIn,
      sessionTtlDays,
    });

    setRefreshTokenCookie(res, result.refreshToken, sessionTtlDays);

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const jwtSecret = req.app.get('jwtSecret');
    const jwtExpiresIn = req.app.get('jwtExpiresIn');
    const sessionTtlDays = req.app.get('sessionTtlDays');

    const result = authService.refresh(db, {
      refreshTokenCookie: req.cookies?.rt,
      jwtSecret,
      jwtExpiresIn,
    });

    setRefreshTokenCookie(res, result.refreshToken, sessionTtlDays);

    res.json({ accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, (req, res, next) => {
  try {
    const db = req.app.get('db');
    authService.logout(db, { sessionId: req.user.sessionId });
    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// Password reset requires authentication. The email is derived from the
// authenticated user's profile to prevent arbitrary password resets.
router.post('/password/reset', authenticate, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const user = userModel.findById(db, req.user.userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    await authService.resetPassword(db, {
      email: user.email,
      newPassword: req.body.newPassword,
    });
    clearRefreshTokenCookie(res);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

export default router;
