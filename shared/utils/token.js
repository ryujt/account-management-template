import { randomBytes, createHash } from 'node:crypto';

/**
 * Generate an opaque refresh token.
 * Format: `userId.sessionId.randomHex(32)`
 *
 * @param {string} userId
 * @param {string} sessionId
 * @returns {string}
 */
export function generateRefreshToken(userId, sessionId) {
  const random = randomBytes(32).toString('hex');
  return `${userId}.${sessionId}.${random}`;
}

/**
 * Parse a refresh token into its components.
 * @param {string} token
 * @returns {{ userId: string, sessionId: string, random: string }}
 */
export function parseRefreshToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid refresh token format');
  }
  return { userId: parts[0], sessionId: parts[1], random: parts[2] };
}

/**
 * Hash the random part of a refresh token with SHA-256.
 * @param {string} token - The full refresh token or just the random part
 * @returns {string} hex-encoded SHA-256 hash
 */
export function hashRefreshToken(token) {
  // If it looks like a full token (contains dots), extract the random part
  const random = token.includes('.') ? token.split('.')[2] : token;
  return createHash('sha256').update(random).digest('hex');
}
