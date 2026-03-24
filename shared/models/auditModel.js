/**
 * Audit log data-access.
 */

/**
 * Write an audit log entry. Best-effort: errors are caught and logged.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ action: string, actorId?: string, targetId?: string, detail?: string, ip?: string }} data
 */
export function writeAudit(db, { action, actorId, targetId, detail, ip }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (action, actor_id, target_id, detail, ip)
      VALUES (?, ?, ?, ?, ?)
    `).run(action, actorId ?? null, targetId ?? null, detail ?? null, ip ?? null);
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}
