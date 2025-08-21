const express = require('express');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('../config/config');
const AuthService = require('../services/authService');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateEmailVerification,
  validateRefreshToken,
  validateUniqueEmail
} = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again later'
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 password reset requests per hour
  message: {
    error: 'Too many password reset requests',
    message: 'Please try again later'
  }
});

// Configure Passport for Google OAuth
if (config.google.clientId && config.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userProfile = {
        email: profile.emails[0].value,
        name: profile.displayName,
        email_verified: profile.emails[0].verified || true
      };
      return done(null, userProfile);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });
}

// Register
router.post('/register',
  registerLimiter,
  validateRegister,
  validateUniqueEmail,
  asyncHandler(async (req, res) => {
    const { email, password, display_name } = req.body;
    
    const result = await AuthService.register({
      email,
      password,
      display_name
    });

    sendSuccess(res, {
      user: result.user,
      message: 'Registration successful. Please check your email for verification instructions.'
    }, 'Registration successful', 201);
  })
);

// Login
router.post('/login',
  authLimiter,
  validateLogin,
  asyncHandler(async (req, res) => {
    const { email, password, remember_me = false } = req.body;
    
    const clientInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await AuthService.login(email, password, clientInfo);

    // Set refresh token as httpOnly cookie
    const cookieMaxAge = remember_me ? 
      config.session.cookieMaxAge * 4 : // Extended for remember me
      config.session.cookieMaxAge;

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: config.session.cookieHttpOnly,
      secure: config.session.cookieSecure,
      sameSite: config.session.cookieSameSite,
      maxAge: cookieMaxAge
    });

    sendSuccess(res, {
      user: result.user,
      roles: result.roles,
      accessToken: result.tokens.accessToken,
      message: 'Login successful'
    });
  })
);

// Google OAuth routes
if (config.google.clientId) {
  // Initiate Google OAuth
  router.get('/oauth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  // Google OAuth callback
  router.get('/oauth/google/callback',
    passport.authenticate('google', { session: false }),
    asyncHandler(async (req, res) => {
      const clientInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await AuthService.oauthLogin(req.user, clientInfo);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: config.session.cookieHttpOnly,
        secure: config.session.cookieSecure,
        sameSite: config.session.cookieSameSite,
        maxAge: config.session.cookieMaxAge
      });

      // Redirect to frontend with success
      const frontendUrl = config.cors.origin[0] || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/auth/oauth/success?token=${result.tokens.accessToken}`);
    })
  );
}

// Refresh token
router.post('/refresh',
  validateRefreshToken,
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refresh_token || req.cookies.refreshToken;

    const result = await AuthService.refreshToken(refreshToken);

    // Update refresh token cookie if it was rotated
    if (result.tokens.refreshToken !== refreshToken) {
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: config.session.cookieHttpOnly,
        secure: config.session.cookieSecure,
        sameSite: config.session.cookieSameSite,
        maxAge: config.session.cookieMaxAge
      });
    }

    sendSuccess(res, {
      user: result.user,
      roles: result.roles,
      accessToken: result.tokens.accessToken
    });
  })
);

// Logout
router.post('/logout',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const sessionId = req.tokenData?.sessionId;
    const userId = req.user?.user_id;
    
    if (sessionId || userId) {
      await AuthService.logout(sessionId, userId);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    sendSuccess(res, null, 'Logged out successfully');
  })
);

// Verify email
router.post('/verify-email',
  validateEmailVerification,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await AuthService.verifyEmail(token);

    sendSuccess(res, {
      user: result.user,
      message: result.message
    });
  })
);

// Resend email verification
router.post('/verify-email/resend',
  authenticate,
  authLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const result = await AuthService.resendEmailVerification(userId);

    sendSuccess(res, null, result.message);
  })
);

// Request password reset
router.post('/password/forgot',
  passwordResetLimiter,
  validatePasswordReset,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await AuthService.requestPasswordReset(email);

    // Always return success message for security
    sendSuccess(res, null, 'If the email exists, a password reset link has been sent');
  })
);

// Reset password
router.post('/password/reset',
  authLimiter,
  validatePasswordResetConfirm,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const result = await AuthService.resetPassword(token, password);

    sendSuccess(res, {
      user: result.user,
      message: result.message
    });
  })
);

// Change password (authenticated)
router.post('/password/change',
  authenticate,
  asyncHandler(async (req, res) => {
    const { current_password, password } = req.body;
    const userId = req.user.user_id;

    // Validate passwords
    if (!current_password || !password) {
      return sendError(res, 'Current password and new password are required', 400);
    }

    if (password.length < 8) {
      return sendError(res, 'New password must be at least 8 characters long', 400);
    }

    if (current_password === password) {
      return sendError(res, 'New password must be different from current password', 400);
    }

    const result = await AuthService.changePassword(userId, current_password, password);

    sendSuccess(res, null, result.message);
  })
);

// Get current user sessions
router.get('/sessions',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const sessions = await AuthService.getUserSessions(userId);

    sendSuccess(res, { sessions });
  })
);

// Revoke session
router.delete('/sessions/:sessionId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.user_id;

    const result = await AuthService.revokeSession(sessionId, userId);

    sendSuccess(res, null, result.message);
  })
);

// Check authentication status
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const userRoles = req.userRoles.map(role => ({
      role_name: role.role_name,
      description: role.description
    }));

    sendSuccess(res, {
      user: req.user.getPublicProfile(),
      roles: userRoles,
      authenticated: true
    });
  })
);

// Health check for auth service
router.get('/health',
  asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        auth: 'operational',
        oauth_google: config.google.clientId ? 'configured' : 'not_configured'
      }
    };

    sendSuccess(res, health);
  })
);

module.exports = router;