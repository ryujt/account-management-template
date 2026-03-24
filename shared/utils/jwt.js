import jwt from 'jsonwebtoken';

/**
 * Sign an access token.
 * @param {{ userId: string, roles: string[], sessionId: string }} payload
 * @param {string} secret
 * @param {string|number} expiresIn - seconds or zeit/ms string
 * @returns {string}
 */
export function signAccessToken({ userId, roles, sessionId }, secret, expiresIn) {
  return jwt.sign({ sub: userId, roles, sid: sessionId }, secret, {
    expiresIn: Number(expiresIn),
  });
}

/**
 * Verify and decode an access token.
 * @param {string} token
 * @param {string} secret
 * @returns {{ sub: string, roles: string[], sid: string, iat: number, exp: number }}
 */
export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret);
}

/**
 * Decode a token without verification (e.g. to extract userId from expired tokens).
 * @param {string} token
 * @returns {object|null}
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
