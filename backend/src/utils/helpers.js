const { v4: uuidv4 } = require('uuid');

function generateId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'INV-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getISOTimestamp() {
  return new Date().toISOString();
}

function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function getExpiresAtTimestamp(days) {
  return getUnixTimestamp() + (days * 24 * 60 * 60);
}

function getExpiresAtTimestampHours(hours) {
  return getUnixTimestamp() + (hours * 60 * 60);
}

function parseUserAgent(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

function extractClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         '0.0.0.0';
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 8;
}

function parseCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  } catch {
    return null;
  }
}

function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

module.exports = {
  generateId,
  generateInviteCode,
  getISOTimestamp,
  getUnixTimestamp,
  getExpiresAtTimestamp,
  getExpiresAtTimestampHours,
  parseUserAgent,
  extractClientIp,
  validateEmail,
  validatePassword,
  parseCursor,
  encodeCursor
};