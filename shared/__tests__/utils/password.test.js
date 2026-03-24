import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../utils/password.js';

describe('hashPassword', () => {
  it('should return a bcrypt hash string', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should produce different hashes for the same input (due to salt)', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2);
  });
});

describe('comparePassword', () => {
  it('should return true for correct password', async () => {
    const hash = await hashPassword('correct');
    const result = await comparePassword('correct', hash);
    expect(result).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('correct');
    const result = await comparePassword('wrong', hash);
    expect(result).toBe(false);
  });
});
