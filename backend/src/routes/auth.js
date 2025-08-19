const express = require('express');
const authService = require('../services/authService');
const { 
  registerValidation, 
  loginValidation, 
  verifyEmailValidation, 
  forgotPasswordValidation, 
  resetPasswordValidation,
  redeemInviteValidation 
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { email, password, displayName, inviteCode } = req.body;
    const result = await authService.register(email, password, displayName, inviteCode);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.cookie('rt', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 14 * 24 * 60 * 60 * 1000
    });

    delete result.refreshToken;
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.rt || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        error: {
          code: 'Unauthorized',
          message: 'Refresh token required',
          details: {}
        }
      });
    }

    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.rt || req.body.refreshToken;
    const userId = req.body.userId;

    if (refreshToken && userId) {
      await authService.logout(userId, refreshToken);
    }

    res.clearCookie('rt');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email', verifyEmailValidation, async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/password/forgot', forgotPasswordValidation, async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/password/reset', resetPasswordValidation, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/invites/redeem', redeemInviteValidation, async (req, res, next) => {
  try {
    const { code, email, password, displayName } = req.body;
    const result = await authService.register(email, password, displayName, code);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;