const ENV = () => ({
  appEnv: process.env.APP_ENV || 'local',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminFrontendUrl: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
});

function getAllowedOrigin(requestOrigin) {
  if (!requestOrigin) return null;
  const { frontendUrl, adminFrontendUrl } = ENV();
  const allowed = [frontendUrl, adminFrontendUrl].filter(Boolean);
  if (allowed.includes(requestOrigin)) return requestOrigin;
  return null;
}

function corsHeaders(origin) {
  const allowedOrigin = getAllowedOrigin(origin);
  if (!allowedOrigin) return {};
  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-credentials': 'true',
    'access-control-max-age': '86400',
  };
}

export function success(body, statusCode = 200, origin = null, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(origin),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function error(err, origin = null) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'InternalError';
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  const payload = { error: { code, message } };
  if (err.details) payload.error.details = err.details;

  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(origin),
    },
    body: JSON.stringify(payload),
  };
}

export function optionsResponse(origin) {
  return {
    statusCode: 204,
    headers: {
      ...corsHeaders(origin),
    },
    body: '',
  };
}

export function buildRefreshCookie(token, maxAge) {
  const { appEnv } = ENV();
  const isLocal = appEnv === 'local';
  const parts = [
    `rt=${token}`,
    'HttpOnly',
    `Path=/auth`,
    `Max-Age=${maxAge}`,
    `SameSite=${isLocal ? 'Lax' : 'Strict'}`,
  ];
  if (!isLocal) parts.push('Secure');
  return parts.join('; ');
}

export function clearRefreshCookie() {
  const { appEnv } = ENV();
  const isLocal = appEnv === 'local';
  const parts = [
    'rt=',
    'HttpOnly',
    'Path=/auth',
    'Max-Age=0',
    `SameSite=${isLocal ? 'Lax' : 'Strict'}`,
  ];
  if (!isLocal) parts.push('Secure');
  return parts.join('; ');
}
