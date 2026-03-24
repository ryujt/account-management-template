/**
 * User data-access functions.
 * Every function receives a better-sqlite3 `db` instance as its first argument.
 */

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ userId: string, email: string, passwordHash: string, displayName: string }} data
 */
export function createUser(db, { userId, email, passwordHash, displayName }) {
  const stmt = db.prepare(`
    INSERT INTO users (user_id, email, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(userId, email, passwordHash, displayName);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} email
 */
export function findByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function findById(db, userId) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {{ displayName: string }} fields
 */
export function updateProfile(db, userId, { displayName }) {
  db.prepare(`
    UPDATE users SET display_name = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(displayName, userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} passwordHash
 */
export function updatePassword(db, userId, passwordHash) {
  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(passwordHash, userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} status
 */
export function updateStatus(db, userId, status) {
  db.prepare(`
    UPDATE users SET status = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(status, userId);
}

/**
 * Escape LIKE special characters in a search string.
 * @param {string} str
 * @returns {string}
 */
function escapeLike(str) {
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * List users with optional filters and cursor-based pagination.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ query?: string, role?: string, status?: string, cursor?: string, limit?: number }} opts
 * @returns {{ users: object[], nextCursor: string|null }}
 */
export function listUsers(db, { query, role, status, cursor, limit = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (query) {
    conditions.push("(u.email LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query)}%`;
    params.push(like, like);
  }

  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }

  if (role) {
    conditions.push('EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.user_id AND r.role = ?)');
    params.push(role);
  }

  if (cursor) {
    conditions.push('u.created_at < ?');
    params.push(cursor);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Fetch one extra to determine if there's a next page
  const fetchLimit = limit + 1;
  params.push(fetchLimit);

  const rows = db.prepare(`
    SELECT u.user_id, u.email, u.display_name, u.status, u.created_at, u.updated_at
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ?
  `).all(...params);

  let nextCursor = null;
  if (rows.length > limit) {
    rows.pop();
    nextCursor = rows[rows.length - 1].created_at;
  }

  return { users: rows, nextCursor };
}
