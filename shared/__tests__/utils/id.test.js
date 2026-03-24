import { describe, it, expect } from 'vitest';
import { generateUserId, generateSessionId } from '../../utils/id.js';

describe('generateUserId', () => {
  it('should start with "u_"', () => {
    const id = generateUserId();
    expect(id).toMatch(/^u_/);
  });

  it('should contain a valid UUID after prefix', () => {
    const id = generateUserId();
    const uuid = id.slice(2);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUserId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateSessionId', () => {
  it('should start with "s_"', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^s_/);
  });

  it('should contain a valid UUID after prefix', () => {
    const id = generateSessionId();
    const uuid = id.slice(2);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
    expect(ids.size).toBe(100);
  });
});
