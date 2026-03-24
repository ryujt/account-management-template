/**
 * Global vitest setup: mock the DynamoDB client before any test.
 * This runs before each test file (configured in vitest.config.js).
 */
import { vi, beforeEach } from 'vitest';
import { mockDocClient, ConditionalCheckFailedException, TransactionCanceledException } from './mockClient.js';

// Mock the db/client module globally
vi.mock('../db/client.js', () => ({
  docClient: mockDocClient,
  TABLE_NAME: 'TestTable',
  AUDIT_TABLE_NAME: 'TestAuditTable',
}));

// Make ConditionalCheckFailedException and TransactionCanceledException available globally
vi.mock('@aws-sdk/client-dynamodb', () => ({
  ConditionalCheckFailedException,
  TransactionCanceledException,
  DynamoDBClient: vi.fn(),
}));

beforeEach(() => {
  mockDocClient.clear();
});
