const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailAdapter {
  constructor() {
    this.provider = config.email.provider;
    this.from = config.email.from;
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    switch (this.provider) {
      case 'smtp':
        return nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      
      case 'stub':
      default:
        // Stub transporter for testing
        return {
          sendMail: async (mailOptions) => {
            console.log('📧 Email would be sent:', {
              from: mailOptions.from,
              to: mailOptions.to,
              subject: mailOptions.subject,
              text: mailOptions.text ? mailOptions.text.substring(0, 100) + '...' : 'No text content',
              html: mailOptions.html ? 'HTML content provided' : 'No HTML content'
            });
            return { messageId: `stub-${Date.now()}@example.com` };
          }
        };
    }
  }

  async sendEmail(to, subject, text, html = null) {
    try {
      const mailOptions = {
        from: this.from,
        to,
        subject,
        text,
        html: html || text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendEmailVerification(user, token) {
    const verificationUrl = `${config.frontend.baseUrl}/verify-email?token=${token}`;
    
    const subject = 'Verify Your Email Address';
    const text = `
Hello ${user.first_name},

Welcome to our platform! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
The Team
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Verify Your Email Address</h2>
  <p>Hello ${user.first_name},</p>
  <p>Welcome to our platform! Please verify your email address by clicking the button below:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${verificationUrl}" 
       style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Verify Email Address
    </a>
  </div>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
  <p><small>This link will expire in 24 hours.</small></p>
  <p>If you didn't create this account, please ignore this email.</p>
  <p>Best regards,<br>The Team</p>
</div>
    `;

    return this.sendEmail(user.email, subject, text, html);
  }

  async sendPasswordReset(user, token) {
    const resetUrl = `${config.frontend.baseUrl}/reset-password?token=${token}`;
    
    const subject = 'Reset Your Password';
    const text = `
Hello ${user.first_name},

We received a request to reset your password. Please click the link below to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

Best regards,
The Team
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Reset Your Password</h2>
  <p>Hello ${user.first_name},</p>
  <p>We received a request to reset your password. Please click the button below to set a new password:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" 
       style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Reset Password
    </a>
  </div>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #666;">${resetUrl}</p>
  <p><small>This link will expire in 1 hour.</small></p>
  <p>If you didn't request a password reset, please ignore this email.</p>
  <p>Best regards,<br>The Team</p>
</div>
    `;

    return this.sendEmail(user.email, subject, text, html);
  }

  async sendInvite(invite, inviteCode) {
    const inviteUrl = `${config.frontend.baseUrl}/invite/${inviteCode}`;
    
    const subject = 'You\'ve Been Invited!';
    const text = `
Hello,

You've been invited to join our platform as a ${invite.role}.

Please click the link below to accept your invitation and create your account:

${inviteUrl}

This invitation will expire on ${invite.expires_at.toLocaleDateString()}.

Best regards,
The Team
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">You've Been Invited!</h2>
  <p>Hello,</p>
  <p>You've been invited to join our platform as a <strong>${invite.role}</strong>.</p>
  <p>Please click the button below to accept your invitation and create your account:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${inviteUrl}" 
       style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Accept Invitation
    </a>
  </div>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
  <p><small>This invitation will expire on ${invite.expires_at.toLocaleDateString()}.</small></p>
  <p>Best regards,<br>The Team</p>
</div>
    `;

    return this.sendEmail(invite.email, subject, text, html);
  }

  async testConnection() {
    if (this.provider === 'stub') {
      return { success: true, message: 'Stub email provider is working' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email connection is working' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailAdapter();