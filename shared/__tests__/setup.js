import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';

/**
 * Create a fresh in-memory SQLite database with schema initialized.
 * @returns {import('better-sqlite3').Database}
 */
export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}
