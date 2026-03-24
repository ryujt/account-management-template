/**
 * local-server.js
 *
 * Thin Express wrapper for fast local development without SAM CLI Docker overhead.
 * Imports directly from the shared layer source, bypassing Lambda /opt paths.
 *
 * Starts 2 Express servers:
 *   - Port 3000: UserApi  (user auth + user API endpoints)
 *   - Port 3001: AdminApi (admin endpoints)
 *
 * Prerequisites:
 *   - DynamoDB Local running on DYNAMODB_ENDPOINT (default: http://localhost:8000)
 *   - Tables created via: node scripts/create-tables.js
 *   - Admin seeded via: node scripts/seed-admin.js
 *
 * Usage:
 *   node scripts/local-server.js
 */

// ------------------------------------------------------------------ //
//  Environment setup (MUST run before any shared module is imported)  //
// ------------------------------------------------------------------ //

process.env.JWT_SECRET ??= 'local-dev-secret-change-me';
process.env.JWT_EXPIRES_IN ??= '900';
process.env.SESSION_TTL_DAYS ??= '14';
process.env.FRONTEND_URL ??= 'http://localhost:5173';
process.env.ADMIN_FRONTEND_URL ??= 'http://localhost:5174';
process.env.NODE_ENV ??= 'development';
process.env.DYNAMODB_ENDPOINT ??= 'http://localhost:8000';
process.env.TABLE_NAME ??= 'AccountManagement';
process.env.AUDIT_TABLE_NAME ??= 'AccountManagement_AuditLog';

// ------------------------------------------------------------------ //
//  Dynamic imports (after env vars are set)                           //
// ------------------------------------------------------------------ //

const { default: express } = await import('express');
const { default: cookieParser } = await import('cookie-parser');

const authService = await import('../shared/services/authService.js');
const userService = await import('../shared/services/userService.js');
const adminService = await import('../shared/services/adminService.js');
const userModel = await import('../shared/models/userModel.js');
const { AppError, ForbiddenError } = await import('../shared/utils/errors.js');
const { verifyAccessToken } = await import('../shared/utils/jwt.js');
const { z } = await import('zod');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN, 10);
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS, 10);
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL;

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

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

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
//  Express middleware helpers                                          //
// ------------------------------------------------------------------ //

function authenticate(req, res, next) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' } });
  }
  const token = header.slice(7);
  try {
    const decoded = verifyAccessToken(token, JWT_SECRET);
    req.user = { userId: decoded.sub, roles: decoded.roles, sessionId: decoded.sid };
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Validation failed', details } });
    }
    req[source] = result.data;
    next();
  };
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}

// ------------------------------------------------------------------ //
//  Cookie helpers                                                      //
// ------------------------------------------------------------------ //

function setRefreshCookie(res, token, ttlDays) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/auth',
    maxAge: ttlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('rt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/auth',
  });
}

// ------------------------------------------------------------------ //
//  User server (port 3000)                                            //
// ------------------------------------------------------------------ //

const userApp = express();
userApp.use(express.json());
userApp.use(cookieParser());

userApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

userApp.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth routes
userApp.post('/auth/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

userApp.post('/auth/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      ip: req.ip,
      ua: req.get('user-agent') ?? '',
      jwtSecret: JWT_SECRET,
      jwtExpiresIn: JWT_EXPIRES_IN,
      sessionTtlDays: SESSION_TTL_DAYS,
    });
    setRefreshCookie(res, result.refreshToken, SESSION_TTL_DAYS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) { next(err); }
});

userApp.post('/auth/refresh', async (req, res, next) => {
  try {
    const result = await authService.refresh({
      refreshTokenCookie: req.cookies?.rt,
      jwtSecret: JWT_SECRET,
      jwtExpiresIn: JWT_EXPIRES_IN,
    });
    setRefreshCookie(res, result.refreshToken, SESSION_TTL_DAYS);
    res.json({ accessToken: result.accessToken });
  } catch (err) { next(err); }
});

userApp.post('/auth/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout({ userId: req.user.userId, sessionId: req.user.sessionId });
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

userApp.post('/auth/password/reset', authenticate, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const record = await userModel.findById(req.user.userId);
    if (!record) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    await authService.resetPassword({ email: record.email, newPassword: req.body.newPassword });
    clearRefreshCookie(res);
    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
});

// User routes (all require auth)
userApp.use('/user', authenticate);

userApp.get('/user/info', async (req, res, next) => {
  try {
    res.json(await userService.getProfile(req.user.userId));
  } catch (err) { next(err); }
});

userApp.patch('/user/info', validate(updateProfileSchema), async (req, res, next) => {
  try {
    res.json(await userService.updateProfile(req.user.userId, req.body));
  } catch (err) { next(err); }
});

userApp.post('/user/changepw', validate(changePasswordSchema), async (req, res, next) => {
  try {
    await userService.changePassword(req.user.userId, req.body);
    res.json({ message: 'Password changed' });
  } catch (err) { next(err); }
});

userApp.get('/user/sessions', async (req, res, next) => {
  try {
    res.json({ sessions: await userService.getSessions(req.user.userId, req.user.sessionId) });
  } catch (err) { next(err); }
});

userApp.delete('/user/sessions/:sessionId', async (req, res, next) => {
  try {
    await userService.revokeSession(req.user.userId, req.params.sessionId, req.user.sessionId);
    res.json({ message: 'Session revoked' });
  } catch (err) { next(err); }
});

userApp.post('/user/withdraw', validate(withdrawSchema), async (req, res, next) => {
  try {
    await userService.withdraw(req.user.userId, req.body);
    res.json({ message: 'Account withdrawn' });
  } catch (err) { next(err); }
});

userApp.use(errorHandler);

// ------------------------------------------------------------------ //
//  Admin server (port 3001)                                           //
// ------------------------------------------------------------------ //

const adminApp = express();
adminApp.use(express.json());
adminApp.use(cookieParser());

adminApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', ADMIN_FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

adminApp.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Admin auth routes
adminApp.post('/auth/login', validate(adminLoginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      ip: req.ip,
      ua: req.get('user-agent') ?? '',
      jwtSecret: JWT_SECRET,
      jwtExpiresIn: JWT_EXPIRES_IN,
      sessionTtlDays: SESSION_TTL_DAYS,
    });

    // Reject non-admin users from the admin API
    if (!result.user.roles?.includes('admin')) {
      const decoded = verifyAccessToken(result.accessToken, JWT_SECRET);
      await authService.logout({ userId: result.user.userId, sessionId: decoded.sid });
      throw new ForbiddenError('Admin access required');
    }

    setRefreshCookie(res, result.refreshToken, SESSION_TTL_DAYS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) { next(err); }
});

adminApp.post('/auth/refresh', async (req, res, next) => {
  try {
    const result = await authService.refresh({
      refreshTokenCookie: req.cookies?.rt,
      jwtSecret: JWT_SECRET,
      jwtExpiresIn: JWT_EXPIRES_IN,
    });
    setRefreshCookie(res, result.refreshToken, SESSION_TTL_DAYS);
    res.json({ accessToken: result.accessToken });
  } catch (err) { next(err); }
});

adminApp.post('/auth/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout({ userId: req.user.userId, sessionId: req.user.sessionId });
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

adminApp.get('/user/info', authenticate, async (req, res, next) => {
  try {
    res.json(await userService.getProfile(req.user.userId));
  } catch (err) { next(err); }
});

// Admin management routes (require auth + admin role)
adminApp.use('/admin', authenticate, requireRole('admin'));

adminApp.get('/admin/users', validate(listUsersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await adminService.listUsers(req.query);
    res.json({ items: result.users, nextCursor: result.nextCursor });
  } catch (err) { next(err); }
});

adminApp.get('/admin/users/:userId', async (req, res, next) => {
  try {
    const detail = await adminService.getUserDetail(req.params.userId);
    const { sessions, ...userFields } = detail;
    res.json({ user: userFields, sessions });
  } catch (err) { next(err); }
});

adminApp.patch('/admin/users/:userId', validate(updateStatusSchema), async (req, res, next) => {
  try {
    await adminService.updateUserStatus(req.params.userId, req.body.status, req.user.userId);
    const detail = await adminService.getUserDetail(req.params.userId);
    res.json(detail);
  } catch (err) { next(err); }
});

adminApp.post('/admin/users/:userId/roles', validate(addRoleSchema), async (req, res, next) => {
  try {
    await adminService.addRole(req.params.userId, req.body.role, req.user.userId);
    const detail = await adminService.getUserDetail(req.params.userId);
    res.json(detail);
  } catch (err) { next(err); }
});

adminApp.delete('/admin/users/:userId/roles/:role', async (req, res, next) => {
  try {
    await adminService.removeRole(req.params.userId, req.params.role, req.user.userId);
    const detail = await adminService.getUserDetail(req.params.userId);
    res.json(detail);
  } catch (err) { next(err); }
});

adminApp.use(errorHandler);

// ------------------------------------------------------------------ //
//  Start servers                                                       //
// ------------------------------------------------------------------ //

const USER_PORT = parseInt(process.env.USER_PORT ?? '3000', 10);
const ADMIN_PORT = parseInt(process.env.ADMIN_PORT ?? '3001', 10);

userApp.listen(USER_PORT, () => {
  console.log(`User API  listening on http://localhost:${USER_PORT}`);
  console.log(`  CORS origin:       ${FRONTEND_URL}`);
  console.log(`  DynamoDB endpoint: ${process.env.DYNAMODB_ENDPOINT}`);
  console.log(`  Table:             ${process.env.TABLE_NAME}`);
});

adminApp.listen(ADMIN_PORT, () => {
  console.log(`Admin API listening on http://localhost:${ADMIN_PORT}`);
  console.log(`  CORS origin: ${ADMIN_FRONTEND_URL}`);
});
