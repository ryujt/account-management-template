/**
 * Role data-access functions.
 */

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @returns {string[]}
 */
export function getRoles(db, userId) {
  const rows = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').all(userId);
  return rows.map((r) => r.role);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} role
 */
export function addRole(db, userId, role) {
  db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)').run(userId, role);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} role
 */
export function removeRole(db, userId, role) {
  db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role = ?').run(userId, role);
}

/**
 * Get all user IDs that hold a given role.
 * @param {import('better-sqlite3').Database} db
 * @param {string} role
 * @returns {string[]}
 */
export function getUsersByRole(db, role) {
  const rows = db.prepare('SELECT user_id FROM user_roles WHERE role = ?').all(role);
  return rows.map((r) => r.user_id);
}
