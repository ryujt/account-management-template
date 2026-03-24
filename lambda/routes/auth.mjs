import { register, login, refresh, logout, resetPassword } from '../services/authService.mjs';
import { authenticate } from '../middleware/auth.mjs';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  parseBody,
} from '../middleware/validation.mjs';
import {
  success,
  error,
  buildRefreshCookie,
  clearRefreshCookie,
} from '../adapters/response.mjs';
import { parseCookies, parseUserAgent } from '../utils/helpers.mjs';
import { NotFoundError } from '../utils/errors.mjs';

export async function handleAuth(event, method, pathParts, origin) {
  // pathParts: ['auth', 'register'] etc.
  const subPath = pathParts.slice(1).join('/');
  const ip =
    event.requestContext?.http?.sourceIp ||
    event.headers?.['x-forwarded-for'] ||
    'unknown';
  const ua = parseUserAgent(
    event.headers?.['user-agent'] || event.headers?.['User-Agent']
  );

  if (method === 'POST' && subPath === 'register') {
    const body = parseBody(event);
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);
    const displayName = validateDisplayName(body.displayName);

    const result = await register({ email, password, displayName });
    return success(result, 201, origin);
  }

  if (method === 'POST' && subPath === 'login') {
    const body = parseBody(event);
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);

    const result = await login({ email, password, ip, ua });

    const cookie = buildRefreshCookie(result.refreshToken, result.sessionTtlSeconds);
    return success(
      {
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
        user: result.user,
      },
      200,
      origin,
      { 'set-cookie': cookie }
    );
  }

  if (method === 'POST' && subPath === 'refresh') {
    const cookies = parseCookies(
      event.headers?.cookie || event.headers?.Cookie
    );
    const refreshTokenRaw = cookies.rt;

    const result = await refresh({ refreshTokenRaw, ip, ua });

    const cookie = buildRefreshCookie(result.refreshToken, result.sessionTtlSeconds);
    return success(
      {
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
        user: result.user,
      },
      200,
      origin,
      { 'set-cookie': cookie }
    );
  }

  if (method === 'POST' && subPath === 'logout') {
    const user = authenticate(event);
    await logout({ userId: user.userId, sessionId: user.sessionId });
    const cookie = clearRefreshCookie();
    return success({ ok: true }, 200, origin, { 'set-cookie': cookie });
  }

  if (method === 'POST' && subPath === 'password/reset') {
    // Requires authentication - user must be logged in to reset their password
    const user = authenticate(event);
    const body = parseBody(event);
    const newPassword = validatePassword(body.newPassword, 'newPassword');

    const result = await resetPassword({ userId: user.userId, newPassword });
    return success(result, 200, origin);
  }

  throw new NotFoundError(`Unknown auth route: ${method} /auth/${subPath}`);
}
