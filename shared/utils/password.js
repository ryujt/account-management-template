import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password.
 * @param {string} plain
 * @returns {Promise<string>}
 */
export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a hash.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
