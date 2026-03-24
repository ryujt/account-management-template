import { handleAuth } from './routes/auth.mjs';
import { handleUser } from './routes/user.mjs';
import { handleAdmin } from './routes/admin.mjs';
import { success, error, optionsResponse } from './adapters/response.mjs';
import { AppError, NotFoundError } from './utils/errors.mjs';

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath = event.requestContext?.http?.path || event.rawPath || event.path || '/';
  const origin = event.headers?.origin || event.headers?.Origin || null;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return optionsResponse(origin);
  }

  // Health check
  if (rawPath === '/' || rawPath === '/health') {
    return success({ status: 'ok', timestamp: new Date().toISOString() }, 200, origin);
  }

  try {
    // Parse path: /auth/login -> ['auth', 'login']
    const pathParts = rawPath
      .split('/')
      .filter(Boolean);

    if (pathParts.length === 0) {
      throw new NotFoundError('Not found');
    }

    const prefix = pathParts[0];

    switch (prefix) {
      case 'auth':
        return await handleAuth(event, method, pathParts, origin);
      case 'user':
        return await handleUser(event, method, pathParts, origin);
      case 'admin':
        return await handleAdmin(event, method, pathParts, origin);
      default:
        throw new NotFoundError(`Unknown route: ${method} ${rawPath}`);
    }
  } catch (err) {
    if (err instanceof AppError) {
      return error(err, origin);
    }
    // Unexpected error - log and return generic 500
    console.error('Unhandled error:', err);
    return error(
      new AppError(500, 'InternalError', 'Internal server error'),
      origin
    );
  }
}
