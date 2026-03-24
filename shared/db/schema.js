/**
 * Initialize all database tables and indexes.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id      TEXT PRIMARY KEY,
      email        TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','disabled','suspended','withdrawn')),
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK (role IN ('member','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, role)
    );

    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

    CREATE TABLE IF NOT EXISTS sessions (
      session_id         TEXT PRIMARY KEY,
      user_id            TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL,
      ip                 TEXT,
      ua                 TEXT,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at         INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at  ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      action     TEXT NOT NULL,
      actor_id   TEXT,
      target_id  TEXT,
      detail     TEXT,
      ip         TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
  `);
}
