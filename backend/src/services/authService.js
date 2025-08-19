const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const db = require('../adapters/database');
const emailAdapter = require('../adapters/email');
const { generateToken, generateId, getCurrentTimestamp, getFutureTimestamp } = require('../utils/helpers');
const { ValidationError, NotFoundError, UnauthorizedError, ConflictError } = require('../utils/errors');

class AuthService {
  
  /**
   * Register a new user
   */
  async register({ email, password, firstName, lastName, inviteCode = null }) {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    let userRoles = ['member'];
    let invite = null;

    // Handle invite code if provided
    if (inviteCode) {
      invite = await db.getInviteByCode(inviteCode);
      if (!invite) {
        throw new NotFoundError('Invalid invite code');
      }

      if (invite.status !== 'pending') {
        throw new ValidationError('Invite code has already been used or expired');
      }

      if (new Date() > new Date(invite.expires_at)) {
        throw new ValidationError('Invite code has expired');
      }

      if (invite.email !== email) {
        throw new ValidationError('Email does not match the invite');
      }

      userRoles = [invite.role];
    }

    // Create user
    const userId = generateId();
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = getFutureTimestamp(1440); // 24 hours

    const userData = {
      user_id: userId,
      email,
      password_hash: password, // Will be hashed by the model hook
      first_name: firstName,
      last_name: lastName,
      roles: userRoles,
      status: 'inactive',
      email_verified: false,
      email_verification_token: emailVerificationToken,
      email_verification_expires: emailVerificationExpires
    };

    const user = await db.createUser(userData);

    // Update invite if used
    if (invite) {
      await db.updateInvite(invite.invite_id, {
        status: 'accepted',
        accepted_at: getCurrentTimestamp(),
        accepted_by: userId
      });
    }

    // Send verification email
    try {
      await emailAdapter.sendEmailVerification(user, emailVerificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    return {
      user: user.toJSON(),
      message: 'User registered successfully. Please check your email to verify your account.'
    };
  }

  /**
   * Login user
   */
  async login({ email, password }, req) {
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      if (user.status === 'inactive') {
        throw new UnauthorizedError('Please verify your email before logging in');
      }
      throw new UnauthorizedError('Account is suspended');
    }

    // Update login info
    await db.updateUser(user.user_id, {
      last_login: getCurrentTimestamp(),
      login_count: user.login_count + 1
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = generateToken();
    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + config.jwt.sessionTtlDays);

    // Create session
    const sessionData = {
      session_id: generateId(),
      user_id: user.user_id,
      refresh_token: refreshToken,
      expires_at: sessionExpires,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      is_active: true
    };

    await db.createSession(sessionData);

    // Return response
    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn
    };
  }

  /**
   * Refresh access token
   */
  async refresh({ refreshToken }) {
    const session = await db.getSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (new Date() > new Date(session.expires_at)) {
      await db.deleteSession(session.session_id);
      throw new UnauthorizedError('Refresh token expired');
    }

    if (!session.is_active) {
      throw new UnauthorizedError('Session is not active');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(session.user);

    // Update session
    await db.updateSession(session.session_id, {
      updated_at: getCurrentTimestamp()
    });

    return {
      accessToken,
      expiresIn: config.jwt.expiresIn
    };
  }

  /**
   * Logout user
   */
  async logout({ userId, refreshToken = null }) {
    if (refreshToken) {
      const session = await db.getSessionByRefreshToken(refreshToken);
      if (session && session.user_id === userId) {
        await db.deleteSession(session.session_id);
      }
    } else {
      // Logout from all sessions
      await db.deleteUserSessions(userId);
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Verify email
   */
  async verifyEmail({ token }) {
    const user = await db.getUserByEmail(''); // We need to find by token instead
    // Since Sequelize doesn't have a direct method, we'll use raw query or add to adapter
    const users = await db.sequelize.query(
      'SELECT * FROM users WHERE email_verification_token = ? AND email_verification_expires > NOW()',
      {
        replacements: [token],
        model: db.User,
        mapToModel: true
      }
    );

    if (users.length === 0) {
      throw new ValidationError('Invalid or expired verification token');
    }

    const user = users[0];

    // Update user
    await db.updateUser(user.user_id, {
      status: 'active',
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword({ email }) {
    const user = await db.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = generateToken();
    const resetExpires = getFutureTimestamp(60); // 1 hour

    await db.updateUser(user.user_id, {
      password_reset_token: resetToken,
      password_reset_expires: resetExpires
    });

    try {
      await emailAdapter.sendPasswordReset(user, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Reset password
   */
  async resetPassword({ token, newPassword }) {
    const users = await db.sequelize.query(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      {
        replacements: [token],
        model: db.User,
        mapToModel: true
      }
    );

    if (users.length === 0) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const user = users[0];

    // Update password and clear reset token
    await db.updateUser(user.user_id, {
      password_hash: newPassword, // Will be hashed by model hook
      password_reset_token: null,
      password_reset_expires: null
    });

    // Invalidate all sessions for security
    await db.deleteUserSessions(user.user_id);

    return { message: 'Password reset successfully' };
  }

  /**
   * Redeem invite code
   */
  async redeemInvite({ inviteCode }) {
    const invite = await db.getInviteByCode(inviteCode);
    if (!invite) {
      throw new NotFoundError('Invalid invite code');
    }

    if (invite.status !== 'pending') {
      throw new ValidationError('Invite code has already been used or expired');
    }

    if (new Date() > new Date(invite.expires_at)) {
      throw new ValidationError('Invite code has expired');
    }

    return {
      invite: {
        code: invite.invite_code,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at
      }
    };
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.user_id,
      email: user.email,
      roles: user.roles
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: `${config.jwt.expiresIn}s`
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new UnauthorizedError('Invalid access token');
    }
  }
}

module.exports = new AuthService();