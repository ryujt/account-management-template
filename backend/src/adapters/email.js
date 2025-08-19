const config = require('../config/config');

class EmailAdapter {
  constructor() {
    this.provider = config.email.provider;
    this.from = config.email.from;
  }

  async sendEmail(to, subject, html) {
    if (this.provider === 'stub') {
      console.log('📧 Email Stub:', {
        from: this.from,
        to,
        subject,
        html: html.substring(0, 200) + '...'
      });
      return { messageId: 'stub-' + Date.now() };
    }

    throw new Error(`Email provider ${this.provider} not implemented`);
  }

  async sendVerificationEmail(email, token) {
    const verifyUrl = `${config.frontend.baseUrl}/auth/verify-email?token=${token}`;
    const subject = 'Verify your email address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${verifyUrl}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `;
    return await this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.frontend.baseUrl}/auth/reset-password?token=${token}`;
    const subject = 'Reset your password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Click the link below:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;
    return await this.sendEmail(email, subject, html);
  }

  async sendInviteEmail(email, code, role) {
    const registerUrl = `${config.frontend.baseUrl}/auth/register?invite=${code}`;
    const subject = 'You have been invited';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invitation</h2>
        <p>You have been invited to join our platform with the role: <strong>${role}</strong></p>
        <p>Your invitation code is: <strong>${code}</strong></p>
        <p>Click the link below to register:</p>
        <a href="${registerUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Register</a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${registerUrl}</p>
        <p>This invitation will expire in 72 hours.</p>
      </div>
    `;
    return await this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailAdapter();