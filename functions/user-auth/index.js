/**
 * UserAuthFunction - Lambda handler for user authentication endpoints.
 *
 * Routes:
 *   POST /auth/register       - Register new user
 *   POST /auth/login          - Login and receive tokens
 *   POST /auth/refresh        - Refresh access token via rt cookie
 *   POST /auth/logout         - Logout (requires auth, clears rt cookie)
 *   POST /auth/password/reset - Reset password (requires auth)
 */

import { z } from '/opt/nodejs/node_modules/zod/index.js';
import * as authService from '/opt/nodejs/node_modules/account-management-shared/services/authService.js';
import * as userModel from '/opt/nodejs/node_modules/account-management-shared/models/userModel.js';
import { AppError, BadRequestError, NotFoundError } from '/opt/nodejs/node_modules/account-management-shared/utils/errors.js';
import { verifyAccessToken } from '/opt/nodejs/node_modules/account-management-shared/utils/jwt.js';

// ------------------------------------------------------------------ //
//  Config                                                              //
// ------------------------------------------------------------------ //

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN ?? '900', 10);
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS ?? '14', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ------------------------------------------------------------------ //
//  Validation schemas                                                  //
// ------------------------------------------------------------------ //

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
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

function response(statusCode, body, extraHeaders = {}, multiValueHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(FRONTEND_URL),
      ...extraHeaders,
    },
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

async function handleRegister(event) {
  const data = validateBody(registerSchema, event.body);
  const result = await authService.register(data);
  return response(201, result);
}

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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
    multiValueHeaders: {
      'Set-Cookie': [clearRefreshTokenCookie()],
    },
    body: JSON.stringify({ message: 'Logged out' }),
  };
}

async function handlePasswordReset(event) {
  const user = extractUser(event);
  const data = validateBody(resetPasswordSchema, event.body);

  const userRecord = await userModel.findById(user.userId);
  if (!userRecord) {
    throw new NotFoundError('User not found');
  }

  await authService.resetPassword({
    email: userRecord.email,
    newPassword: data.newPassword,
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(FRONTEND_URL) },
    multiValueHeaders: {
      'Set-Cookie': [clearRefreshTokenCookie()],
    },
    body: JSON.stringify({ message: 'Password reset successful' }),
  };
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
    if (method === 'POST' && path === '/auth/register') {
      return await handleRegister(event);
    }
    if (method === 'POST' && path === '/auth/login') {
      return await handleLogin(event);
    }
    if (method === 'POST' && path === '/auth/refresh') {
      return await handleRefresh(event);
    }
    if (method === 'POST' && path === '/auth/logout') {
      return await handleLogout(event);
    }
    if (method === 'POST' && path === '/auth/password/reset') {
      return await handlePasswordReset(event);
    }

    return response(404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
  } catch (err) {
    return errorResponse(err);
  }
}
