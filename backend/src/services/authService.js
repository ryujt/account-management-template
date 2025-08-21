const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { User, Session, EmailVerification, PasswordReset } = require('../models');
const { AppError } = require('../middleware/errorHandler');

class AuthService {
  // Generate JWT tokens
  static generateAccessToken(user) {
    const payload = {
      userId: user.user_id,
      email: user.email,
      type: 'access'
    };

    return jwt.sign(payload, config.jwt.accessTokenSecret, {
      expiresIn: config.jwt.accessTokenExpiration,
      issuer: config.jwt.issuer,
      subject: user.user_id.toString()
    });
  }

  static generateRefreshToken() {
    return Session.generateRefreshToken();
  }

  // Register new user
  static async register(userData) {
    try {
      const { email, password, display_name } = userData;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new AppError('Email address is already registered', 409, 'EMAIL_EXISTS');
      }

      // Create user
      const user = await User.create({
        email,
        password,
        display_name,
        status: 'active',
        email_verified: false
      });

      // Assign default member role
      await user.assignRole('member');

      // Generate email verification token
      const { token } = await EmailVerification.create(user.user_id);

      return {
        user: user.getPublicProfile(),
        verificationToken: token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  static async login(email, password, clientInfo = {}) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
      }

      // Verify password
      if (!user.password_hash) {
        throw new AppError('Account requires password setup', 400, 'PASSWORD_SETUP_REQUIRED');
      }

      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Generate tokens
      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken();

      // Create session
      const session = await Session.create(user.user_id, refreshToken, clientInfo);

      // Get user roles
      const userRoles = await user.getRoles();

      return {
        user: user.getPublicProfile(),
        roles: userRoles,
        tokens: {
          accessToken,
          refreshToken
        },
        session: session.toJSON()
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // OAuth login (Google)
  static async oauthLogin(profile, clientInfo = {}) {
    try {
      const { email, name, email_verified } = profile;

      // Find or create user
      let user = await User.findByEmail(email);
      
      if (!user) {
        // Create new user from OAuth profile
        user = await User.create({
          email,
          display_name: name,
          email_verified: email_verified || true, // OAuth emails are typically verified
          status: 'active'
          // Note: no password_hash for OAuth users
        });

        // Assign default member role
        await user.assignRole('member');
      } else {
        // Update email verification status if OAuth provider verifies it
        if (email_verified && !user.email_verified) {
          await user.verifyEmail();
        }
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
      }

      // Generate tokens
      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken();

      // Create session
      const session = await Session.create(user.user_id, refreshToken, clientInfo);

      // Get user roles
      const userRoles = await user.getRoles();

      return {
        user: user.getPublicProfile(),
        roles: userRoles,
        tokens: {
          accessToken,
          refreshToken
        },
        session: session.toJSON()
      };
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  }

  // Refresh access token
  static async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
      }

      // Find session by refresh token
      const session = await Session.findByToken(refreshToken);
      if (!session || !session.isValid()) {
        throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Get user
      const user = await User.findById(session.user_id);
      if (!user || user.status !== 'active') {
        throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
      }

      // Generate new access token
      const accessToken = AuthService.generateAccessToken(user);

      // Optionally rotate refresh token
      let newRefreshToken = refreshToken;
      if (config.jwt.rotateRefreshToken) {
        newRefreshToken = AuthService.generateRefreshToken();
        await session.updateToken(newRefreshToken);
      }

      // Extend session
      await session.extend();

      // Get user roles
      const userRoles = await user.getRoles();

      return {
        user: user.getPublicProfile(),
        roles: userRoles,
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        },
        session: session.toJSON()
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Logout user
  static async logout(sessionId, userId = null) {
    try {
      if (sessionId) {
        const session = await Session.findById(sessionId);
        if (session) {
          await session.revoke();
        }
      } else if (userId) {
        // Logout all sessions for user
        await Session.revokeAllByUserId(userId);
      }

      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Email verification
  static async verifyEmail(token) {
    try {
      const verification = await EmailVerification.findByToken(token);
      if (!verification || !verification.isValid()) {
        throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
      }

      // Get user and verify email
      const user = await User.findById(verification.user_id);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      await user.verifyEmail();
      await verification.consume();

      return {
        message: 'Email verified successfully',
        user: user.getPublicProfile()
      };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Resend email verification
  static async resendEmailVerification(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.email_verified) {
        throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Check if there's already a pending verification
      const hasPending = await EmailVerification.hasPendingVerification(userId);
      if (hasPending) {
        throw new AppError('Verification email already sent. Please check your inbox or wait before requesting again.', 429, 'VERIFICATION_ALREADY_SENT');
      }

      // Generate new verification token
      const { token } = await EmailVerification.create(userId);

      return {
        message: 'Verification email sent',
        verificationToken: token
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  // Request password reset
  static async requestPasswordReset(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // Check rate limit
      const canRequest = await PasswordReset.checkRateLimit(user.user_id);
      if (!canRequest) {
        throw new AppError('Too many password reset requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
      }

      // Generate password reset token
      const { token } = await PasswordReset.create(user.user_id);

      return {
        message: 'Password reset email sent',
        resetToken: token,
        user: user.getPublicProfile()
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    try {
      const reset = await PasswordReset.findByToken(token);
      if (!reset || !reset.isValid()) {
        throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
      }

      // Get user and update password
      const user = await User.findById(reset.user_id);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      await user.updatePassword(newPassword);
      await reset.consume();

      // Revoke all existing sessions for security
      await Session.revokeAllByUserId(user.user_id);

      return {
        message: 'Password reset successfully',
        user: user.getPublicProfile()
      };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Change password (authenticated user)
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      if (!user.password_hash) {
        throw new AppError('Account requires password setup', 400, 'PASSWORD_SETUP_REQUIRED');
      }

      const isCurrentPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }

      // Update password
      await user.updatePassword(newPassword);

      // Revoke other sessions for security (keep current session)
      // Note: This would require passing current session ID to exclude it
      
      return {
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  // Get user sessions
  static async getUserSessions(userId) {
    try {
      const sessions = await Session.findByUserId(userId);
      return sessions.map(session => session.toJSON());
    } catch (error) {
      console.error('Get user sessions error:', error);
      throw error;
    }
  }

  // Revoke session
  static async revokeSession(sessionId, userId) {
    try {
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
      }

      // Check if user owns the session (for non-admin users)
      if (session.user_id !== userId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      await session.revoke();

      return { message: 'Session revoked successfully' };
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  }

  // Initialize admin user
  static async initializeAdmin() {
    try {
      if (!config.admin.email || !config.admin.tempPassword) {
        console.log('Admin initialization skipped - no admin credentials provided');
        return null;
      }

      // Check if admin already exists
      const existingAdmin = await User.findByEmail(config.admin.email);
      if (existingAdmin) {
        console.log('Admin user already exists');
        return existingAdmin;
      }

      // Create admin user
      const admin = await User.create({
        email: config.admin.email,
        password: config.admin.tempPassword,
        display_name: 'Administrator',
        email_verified: true, // Admin emails are pre-verified
        status: 'active'
      });

      // Assign admin role
      await admin.assignRole('admin');
      await admin.assignRole('member'); // Admin inherits member permissions

      console.log(`Admin user created: ${config.admin.email}`);
      console.log('IMPORTANT: Please change the admin password on first login');

      return admin;
    } catch (error) {
      console.error('Admin initialization error:', error);
      throw error;
    }
  }

  // Validate session
  static async validateSession(sessionId) {
    try {
      const session = await Session.findById(sessionId);
      return session && session.isValid() ? session : null;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Cleanup expired tokens and sessions
  static async cleanup() {
    try {
      console.log('Starting auth cleanup...');
      
      const sessionCleanup = await Session.cleanup();
      const emailCleanup = await EmailVerification.cleanup();
      const resetCleanup = await PasswordReset.cleanup();

      console.log(`Auth cleanup completed: ${sessionCleanup} sessions, ${emailCleanup} email verifications, ${resetCleanup} password resets`);
      
      return {
        sessions: sessionCleanup,
        emailVerifications: emailCleanup,
        passwordResets: resetCleanup
      };
    } catch (error) {
      console.error('Auth cleanup error:', error);
      throw error;
    }
  }
}

module.exports = AuthService;