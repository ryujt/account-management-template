/**
 * Session data-access functions.
 */

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ sessionId: string, userId: string, refreshTokenHash: string, ip?: string, ua?: string, expiresAt: number }} data
 */
export function createSession(db, { sessionId, userId, refreshTokenHash, ip, ua, expiresAt }) {
  db.prepare(`
    INSERT INTO sessions (session_id, user_id, refresh_token_hash, ip, ua, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, refreshTokenHash, ip ?? null, ua ?? null, expiresAt);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 */
export function findSession(db, sessionId) {
  return db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {string} newHash
 */
export function updateRefreshToken(db, sessionId, newHash) {
  db.prepare('UPDATE sessions SET refresh_token_hash = ? WHERE session_id = ?').run(newHash, sessionId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 */
export function deleteSession(db, sessionId) {
  db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function deleteUserSessions(db, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Get all active (non-expired) sessions for a user.
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function getUserSessions(db, userId) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT session_id, ip, ua, created_at, expires_at
    FROM sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).all(userId, now);
}

/**
 * Remove all expired sessions.
 * @param {import('better-sqlite3').Database} db
 */
export function cleanupExpired(db) {
  const now = Math.floor(Date.now() / 1000);
  const info = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  return info.changes;
}
