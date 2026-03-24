import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

/** @type {Map<string, Database.Database>} */
const pool = new Map();

/**
 * Get or create a better-sqlite3 Database instance for the given path.
 * Connections are cached by resolved path (singleton per path).
 *
 * @param {string} dbPath - Filesystem path to the SQLite database file
 * @returns {Database.Database}
 */
export function getDb(dbPath) {
  if (pool.has(dbPath)) {
    return pool.get(dbPath);
  }

  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  pool.set(dbPath, db);
  return db;
}
