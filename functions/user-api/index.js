/**
 * UserApiFunction - Lambda handler for user API endpoints.
 * All routes require authentication via Bearer token.
 *
 * Routes:
 *   GET    /health               - Health check
 *   GET    /user/info            - Get user profile
 *   PATCH  /user/info            - Update display name
 *   POST   /user/changepw        - Change password
 *   GET    /user/sessions        - List sessions
 *   DELETE /user/sessions/{id}   - Revoke a session
 *   POST   /user/withdraw        - Withdraw account
 */

import { z } from '/opt/nodejs/node_modules/zod/index.js';
import * as userService from '/opt/nodejs/node_modules/account-management-shared/services/userService.js';
import { AppError, BadRequestError } from '/opt/nodejs/node_modules/account-management-shared/utils/errors.js';
import { verifyAccessToken } from '/opt/nodejs/node_modules/account-management-shared/utils/jwt.js';

// ------------------------------------------------------------------ //
//  Config                                                              //
// ------------------------------------------------------------------ //

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ------------------------------------------------------------------ //
//  Validation schemas                                                  //
// ------------------------------------------------------------------ //

const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const withdrawSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// ------------------------------------------------------------------ //
//  Response helpers                                                    //
// ------------------------------------------------------------------ //

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
    multiValueHeaders: {},
    body: JSON.stringify(body),
  };
}

function errorResponse(err) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return {
      statusCode: err.statusCode,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
      multiValueHeaders: {},
      body: JSON.stringify(body),
    };
  }

  console.error('[unhandled]', err);
  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
    multiValueHeaders: {},
    body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }),
  };
}

// ------------------------------------------------------------------ //
//  Auth helper                                                         //
// ------------------------------------------------------------------ //

function extractUser(event) {
  const header = event.headers?.Authorization ?? event.headers?.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header');
  }
  const token = header.slice(7);
  try {
    const decoded = verifyAccessToken(token, JWT_SECRET);
    return { userId: decoded.sub, roles: decoded.roles, sessionId: decoded.sid };
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}

function validateBody(schema, rawBody) {
  const body = JSON.parse(rawBody ?? '{}');
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw new BadRequestError('Validation failed', details);
  }
  return parsed.data;
}

// ------------------------------------------------------------------ //
//  Route handlers                                                      //
// ------------------------------------------------------------------ //

async function handleGetProfile(event) {
  const user = extractUser(event);
  const profile = await userService.getProfile(user.userId);
  return response(200, profile);
}

async function handleUpdateProfile(event) {
  const user = extractUser(event);
  const data = validateBody(updateProfileSchema, event.body);
  const profile = await userService.updateProfile(user.userId, data);
  return response(200, profile);
}

async function handleChangePassword(event) {
  const user = extractUser(event);
  const data = validateBody(changePasswordSchema, event.body);
  await userService.changePassword(user.userId, data);
  return response(200, { message: 'Password changed' });
}

async function handleGetSessions(event) {
  const user = extractUser(event);
  const sessions = await userService.getSessions(user.userId, user.sessionId);
  return response(200, { sessions });
}

async function handleRevokeSession(event) {
  const user = extractUser(event);
  const sessionId = event.pathParameters?.sessionId;
  if (!sessionId) {
    throw new BadRequestError('sessionId path parameter is required');
  }
  await userService.revokeSession(user.userId, sessionId, user.sessionId);
  return response(200, { message: 'Session revoked' });
}

async function handleWithdraw(event) {
  const user = extractUser(event);
  const data = validateBody(withdrawSchema, event.body);
  await userService.withdraw(user.userId, data);
  return response(200, { message: 'Account withdrawn' });
}

// ------------------------------------------------------------------ //
//  Main handler                                                        //
// ------------------------------------------------------------------ //

export async function handler(event) {
  const method = event.httpMethod;
  const path = event.path ?? event.resource ?? '';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(FRONTEND_URL), multiValueHeaders: {}, body: '' };
  }

  try {
    if (method === 'GET' && path === '/health') {
      return response(200, { status: 'ok' });
    }
    if (method === 'GET' && path === '/user/info') {
      return await handleGetProfile(event);
    }
    if (method === 'PATCH' && path === '/user/info') {
      return await handleUpdateProfile(event);
    }
    if (method === 'POST' && path === '/user/changepw') {
      return await handleChangePassword(event);
    }
    if (method === 'GET' && path === '/user/sessions') {
      return await handleGetSessions(event);
    }
    if (method === 'DELETE' && path.startsWith('/user/sessions/')) {
      return await handleRevokeSession(event);
    }
    if (method === 'POST' && path === '/user/withdraw') {
      return await handleWithdraw(event);
    }

    return response(404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
  } catch (err) {
    return errorResponse(err);
  }
}
