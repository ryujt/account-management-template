/**
 * AdminApiFunction - Lambda handler for admin API endpoints.
 *
 * Routes:
 *   POST   /auth/login                       - Admin login
 *   POST   /auth/refresh                     - Refresh access token
 *   POST   /auth/logout                      - Logout (requires auth)
 *   GET    /user/info                         - Get own profile (requires auth)
 *   GET    /admin/users                       - List users (requires admin role)
 *   GET    /admin/users/{userId}              - Get user detail (requires admin role)
 *   PATCH  /admin/users/{userId}              - Update user status (requires admin role)
 *   POST   /admin/users/{userId}/roles        - Add role (requires admin role)
 *   DELETE /admin/users/{userId}/roles/{role} - Remove role (requires admin role)
 *   GET    /health                            - Health check
 */

import { z } from '/opt/nodejs/node_modules/zod/index.js';
import * as authService from '/opt/nodejs/node_modules/account-management-shared/services/authService.js';
import * as userService from '/opt/nodejs/node_modules/account-management-shared/services/userService.js';
import * as adminService from '/opt/nodejs/node_modules/account-management-shared/services/adminService.js';
import { AppError, BadRequestError, ForbiddenError } from '/opt/nodejs/node_modules/account-management-shared/utils/errors.js';
import { verifyAccessToken } from '/opt/nodejs/node_modules/account-management-shared/utils/jwt.js';

// ------------------------------------------------------------------ //
//  Config                                                              //
// ------------------------------------------------------------------ //

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN ?? '900', 10);
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS ?? '14', 10);
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL ?? 'http://localhost:5174';

// ------------------------------------------------------------------ //
//  Validation schemas                                                  //
// ------------------------------------------------------------------ //

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const listUsersQuerySchema = z.object({
  query: z.string().optional(),
  role: z.enum(['member', 'admin']).optional(),
  status: z.enum(['active', 'disabled', 'suspended', 'withdrawn']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'suspended']),
});

const addRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
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

function response(statusCode, body, multiValueHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(ADMIN_FRONTEND_URL) },
    multiValueHeaders,
    body: JSON.stringify(body),
  };
}

function errorResponse(err) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return {
      statusCode: err.statusCode,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(ADMIN_FRONTEND_URL) },
      multiValueHeaders: {},
      body: JSON.stringify(body),
    };
  }

  console.error('[unhandled]', err);
  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(ADMIN_FRONTEND_URL) },
    multiValueHeaders: {},
    body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }),
  };
}

// ------------------------------------------------------------------ //
//  Cookie helpers                                                      //
// ------------------------------------------------------------------ //

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const idx = c.indexOf('=');
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    }),
  );
}

function buildRefreshTokenCookie(token, sessionTtlDays) {
  const maxAge = sessionTtlDays * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax';
  return `rt=${token}; HttpOnly${secure}; SameSite=${sameSite}; Path=/auth; Max-Age=${maxAge}`;
}

function clearRefreshTokenCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax';
  return `rt=; HttpOnly${secure}; SameSite=${sameSite}; Path=/auth; Max-Age=0`;
}

// ------------------------------------------------------------------ //
//  Auth / RBAC helpers                                                 //
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

function requireAdmin(user) {
  if (!user.roles?.includes('admin')) {
    throw new ForbiddenError('Insufficient permissions');
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

async function handleLogin(event) {
  const data = validateBody(loginSchema, event.body);
  const ip = event.requestContext?.identity?.sourceIp ?? event.headers?.['X-Forwarded-For'] ?? '';
  const ua = event.headers?.['User-Agent'] ?? event.headers?.['user-agent'] ?? '';

  const result = await authService.login({
    ...data,
    ip,
    ua,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
    sessionTtlDays: SESSION_TTL_DAYS,
  });

  // Reject non-admin users from the admin API
  if (!result.user.roles?.includes('admin')) {
    // Clean up the session that was just created
    const decoded = verifyAccessToken(result.accessToken, JWT_SECRET);
    await authService.logout({ userId: result.user.userId, sessionId: decoded.sid });
    throw new ForbiddenError('Admin access required');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(ADMIN_FRONTEND_URL) },
    multiValueHeaders: {
      'Set-Cookie': [buildRefreshTokenCookie(result.refreshToken, SESSION_TTL_DAYS)],
    },
    body: JSON.stringify({ accessToken: result.accessToken, user: result.user }),
  };
}

async function handleRefresh(event) {
  const cookieHeader = event.headers?.Cookie ?? event.headers?.cookie ?? '';
  const cookies = parseCookies(cookieHeader);

  const result = await authService.refresh({
    refreshTokenCookie: cookies.rt,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(ADMIN_FRONTEND_URL) },
    multiValueHeaders: {
      'Set-Cookie': [buildRefreshTokenCookie(result.refreshToken, SESSION_TTL_DAYS)],
    },
    body: JSON.stringify({ accessToken: result.accessToken }),
  };
}

async function handleLogout(event) {
  const user = extractUser(event);
  await authService.logout({ userId: user.userId, sessionId: user.sessionId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(ADMIN_FRONTEND_URL) },
    multiValueHeaders: {
      'Set-Cookie': [clearRefreshTokenCookie()],
    },
    body: JSON.stringify({ message: 'Logged out' }),
  };
}

async function handleGetUserInfo(event) {
  const user = extractUser(event);
  const profile = await userService.getProfile(user.userId);
  return response(200, profile);
}

async function handleListUsers(event) {
  const user = extractUser(event);
  requireAdmin(user);

  const queryParams = event.queryStringParameters ?? {};
  const parsed = listUsersQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw new BadRequestError('Validation failed', details);
  }

  const result = await adminService.listUsers(parsed.data);
  return response(200, { items: result.users, nextCursor: result.nextCursor });
}

async function handleGetUserDetail(event) {
  const user = extractUser(event);
  requireAdmin(user);

  const userId = event.pathParameters?.userId;
  if (!userId) throw new BadRequestError('userId path parameter is required');

  const detail = await adminService.getUserDetail(userId);
  const { sessions, ...userFields } = detail;
  return response(200, { user: userFields, sessions });
}

async function handleUpdateUserStatus(event) {
  const user = extractUser(event);
  requireAdmin(user);

  const userId = event.pathParameters?.userId;
  if (!userId) throw new BadRequestError('userId path parameter is required');

  const data = validateBody(updateStatusSchema, event.body);

  await adminService.updateUserStatus(userId, data.status, user.userId);
  const detail = await adminService.getUserDetail(userId);
  return response(200, detail);
}

async function handleAddRole(event) {
  const user = extractUser(event);
  requireAdmin(user);

  const userId = event.pathParameters?.userId;
  if (!userId) throw new BadRequestError('userId path parameter is required');

  const data = validateBody(addRoleSchema, event.body);

  await adminService.addRole(userId, data.role, user.userId);
  const detail = await adminService.getUserDetail(userId);
  return response(200, detail);
}

async function handleRemoveRole(event) {
  const user = extractUser(event);
  requireAdmin(user);

  const userId = event.pathParameters?.userId;
  const role = event.pathParameters?.role;
  if (!userId) throw new BadRequestError('userId path parameter is required');
  if (!role) throw new BadRequestError('role path parameter is required');

  await adminService.removeRole(userId, role, user.userId);
  const detail = await adminService.getUserDetail(userId);
  return response(200, detail);
}

// ------------------------------------------------------------------ //
//  Main handler                                                        //
// ------------------------------------------------------------------ //

export async function handler(event) {
  const method = event.httpMethod;
  const path = event.path ?? event.resource ?? '';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(ADMIN_FRONTEND_URL), multiValueHeaders: {}, body: '' };
  }

  try {
    // Auth routes
    if (method === 'POST' && path === '/auth/login') {
      return await handleLogin(event);
    }
    if (method === 'POST' && path === '/auth/refresh') {
      return await handleRefresh(event);
    }
    if (method === 'POST' && path === '/auth/logout') {
      return await handleLogout(event);
    }

    // User info (own profile)
    if (method === 'GET' && path === '/user/info') {
      return await handleGetUserInfo(event);
    }

    // Admin routes
    if (method === 'GET' && path === '/admin/users') {
      return await handleListUsers(event);
    }
    if (method === 'GET' && /^\/admin\/users\/[^/]+$/.test(path)) {
      return await handleGetUserDetail(event);
    }
    if (method === 'PATCH' && /^\/admin\/users\/[^/]+$/.test(path)) {
      return await handleUpdateUserStatus(event);
    }
    if (method === 'POST' && /^\/admin\/users\/[^/]+\/roles$/.test(path)) {
      return await handleAddRole(event);
    }
    if (method === 'DELETE' && /^\/admin\/users\/[^/]+\/roles\/[^/]+$/.test(path)) {
      return await handleRemoveRole(event);
    }

    // Health
    if (method === 'GET' && path === '/health') {
      return response(200, { status: 'ok' });
    }

    return response(404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
  } catch (err) {
    return errorResponse(err);
  }
}
