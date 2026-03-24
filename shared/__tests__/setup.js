/**
 * Test setup file - runs before each test file.
 * Resets the mock DynamoDB client state.
 */
import { beforeEach } from 'vitest';
import { mockDocClient } from './mockClient.js';

beforeEach(() => {
  mockDocClient.clear();
});
