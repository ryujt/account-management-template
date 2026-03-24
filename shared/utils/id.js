import { randomUUID } from 'node:crypto';

/** Generate a unique user ID. */
export function generateUserId() {
  return `u_${randomUUID()}`;
}

/** Generate a unique session ID. */
export function generateSessionId() {
  return `s_${randomUUID()}`;
}
