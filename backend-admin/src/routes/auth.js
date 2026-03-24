import { Router } from 'express';
import { z } from 'zod';
import { validate } from 'account-management-shared/middleware/validate';
import { authenticate } from 'account-management-shared/middleware/authenticate';
import * as authService from 'account-management-shared/services/authService';

const router = Router();

/* ------------------------------------------------------------------ */
/*  Validation schemas                                                */
/* ------------------------------------------------------------------ */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function setRefreshCookie(res, token, sessionTtlDays) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/auth',
    maxAge: sessionTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('rt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/auth',
  });
}

/* ------------------------------------------------------------------ */
/*  POST /auth/login                                                  */
/* ------------------------------------------------------------------ */

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const jwtSecret = req.app.get('jwtSecret');
    const jwtExpiresIn = req.app.get('jwtExpiresIn');
    const sessionTtlDays = req.app.get('sessionTtlDays');

    const { email, password } = req.body;
    const ip = req.ip;
    const ua = req.get('user-agent') ?? '';

    const result = await authService.login(db, {
      email,
      password,
      ip,
      ua,
      jwtSecret,
      jwtExpiresIn,
      sessionTtlDays,
    });

    setRefreshCookie(res, result.refreshToken, sessionTtlDays);

    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /auth/refresh                                                */
/* ------------------------------------------------------------------ */

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

    setRefreshCookie(res, result.refreshToken, sessionTtlDays);

    res.status(200).json({
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /auth/logout                                                 */
/* ------------------------------------------------------------------ */

router.post('/logout', authenticate, (req, res, next) => {
  try {
    const db = req.app.get('db');
    authService.logout(db, { sessionId: req.user.sessionId });
    clearRefreshCookie(res);
    res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

export default router;
