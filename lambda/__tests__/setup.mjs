import { vi } from 'vitest';

// Set env vars before anything else
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.DDB_TABLE = 'test-table';
process.env.SESSION_TTL_DAYS = '14';
process.env.APP_ENV = 'local';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.ADMIN_FRONTEND_URL = 'http://localhost:5174';
process.env.JWT_EXPIRES_IN = '900';

// Mock the DynamoDB adapter globally
vi.mock('../adapters/dynamodb.mjs', () => ({
  getItem: vi.fn(),
  putItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  query: vi.fn(),
  scan: vi.fn(),
  transactWrite: vi.fn(),
  batchDelete: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserRoles: vi.fn(),
  getUserSessions: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  deleteAllSessions: vi.fn(),
  writeAuditLog: vi.fn(),
}));
