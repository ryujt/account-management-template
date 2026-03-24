import { randomUUID, randomBytes, createHash } from 'node:crypto';

export function generateUserId() {
  return `u_${randomUUID().replace(/-/g, '')}`;
}

export function generateSessionId() {
  return `s_${randomUUID().replace(/-/g, '')}`;
}

export function generateRefreshToken(userId, sessionId) {
  const random = randomBytes(32).toString('hex');
  return `${userId}.${sessionId}.${random}`;
}

export function hashRefreshToken(token) {
  // Hash only the random part to avoid leaking userId/sessionId in stored hash
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return createHash('sha256').update(token).digest('hex');
  const random = token.substring(lastDot + 1);
  return createHash('sha256').update(random).digest('hex');
}

export function parseRefreshToken(token) {
  const parts = token.split('.');
  if (parts.length < 3) return null;
  return {
    userId: parts[0],
    sessionId: parts[1],
    random: parts.slice(2).join('.'),
  };
}

export function nowISO() {
  return new Date().toISOString();
}

export function epochSecondsFromDays(days) {
  return Math.floor(Date.now() / 1000) + days * 86400;
}

export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const cookies = {};
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.substring(0, eqIndex).trim();
    const value = pair.substring(eqIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function parseUserAgent(uaString) {
  if (!uaString) return 'Unknown';
  if (uaString.length > 200) return uaString.substring(0, 200);
  return uaString;
}
