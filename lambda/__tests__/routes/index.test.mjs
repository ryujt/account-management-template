import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../index.mjs';

// We need to mock the route handlers since they depend on DynamoDB and auth
vi.mock('../../routes/auth.mjs', () => ({
  handleAuth: vi.fn(),
}));
vi.mock('../../routes/user.mjs', () => ({
  handleUser: vi.fn(),
}));
vi.mock('../../routes/admin.mjs', () => ({
  handleAdmin: vi.fn(),
}));

import { handleAuth } from '../../routes/auth.mjs';
import { handleUser } from '../../routes/user.mjs';
import { handleAdmin } from '../../routes/admin.mjs';
import { AppError, NotFoundError } from '../../utils/errors.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeEvent(method, path, overrides = {}) {
  return {
    requestContext: { http: { method, path } },
    headers: { origin: 'http://localhost:5173', ...overrides.headers },
    ...overrides,
  };
}

describe('handler - CORS preflight', () => {
  it('returns 204 for OPTIONS request', async () => {
    const result = await handler(makeEvent('OPTIONS', '/auth/login'));
    expect(result.statusCode).toBe(204);
    expect(result.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('handler - health check', () => {
  it('returns 200 for / path', async () => {
    const result = await handler(makeEvent('GET', '/'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });

  it('returns 200 for /health path', async () => {
    const result = await handler(makeEvent('GET', '/health'));
    expect(result.statusCode).toBe(200);
  });
});

describe('handler - route dispatch', () => {
  it('routes /auth/* to handleAuth', async () => {
    handleAuth.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: '{"ok":true}',
    });

    const event = makeEvent('POST', '/auth/login');
    const result = await handler(event);

    expect(handleAuth).toHaveBeenCalledWith(
      event,
      'POST',
      ['auth', 'login'],
      'http://localhost:5173'
    );
    expect(result.statusCode).toBe(200);
  });

  it('routes /user/* to handleUser', async () => {
    handleUser.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: '{"ok":true}',
    });

    const event = makeEvent('GET', '/user/info');
    await handler(event);

    expect(handleUser).toHaveBeenCalledWith(
      event,
      'GET',
      ['user', 'info'],
      'http://localhost:5173'
    );
  });

  it('routes /admin/* to handleAdmin', async () => {
    handleAdmin.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: '{"ok":true}',
    });

    const event = makeEvent('GET', '/admin/users');
    await handler(event);

    expect(handleAdmin).toHaveBeenCalledWith(
      event,
      'GET',
      ['admin', 'users'],
      'http://localhost:5173'
    );
  });
});

describe('handler - unknown routes', () => {
  it('returns 404 for unknown prefix', async () => {
    const result = await handler(makeEvent('GET', '/unknown/path'));
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('NotFound');
  });
});

describe('handler - error handling', () => {
  it('returns proper error for AppError thrown by route', async () => {
    handleAuth.mockRejectedValue(new AppError(400, 'BadRequest', 'Bad input'));

    const result = await handler(makeEvent('POST', '/auth/register'));
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('BadRequest');
    expect(body.error.message).toBe('Bad input');
  });

  it('returns 500 for unexpected errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    handleAuth.mockRejectedValue(new Error('Unexpected DB error'));

    const result = await handler(makeEvent('POST', '/auth/login'));
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.message).toBe('Internal server error');

    consoleSpy.mockRestore();
  });

  it('extracts method from httpMethod fallback', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/health',
      headers: {},
    };
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('extracts path from rawPath fallback', async () => {
    const event = {
      requestContext: { http: { method: 'GET' } },
      rawPath: '/health',
      headers: {},
    };
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });
});

describe('handler - CORS headers', () => {
  it('includes CORS headers for allowed origin', async () => {
    const result = await handler(makeEvent('GET', '/health'));
    expect(result.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(result.headers['access-control-allow-credentials']).toBe('true');
  });

  it('omits CORS headers for disallowed origin', async () => {
    const event = makeEvent('GET', '/health', {
      headers: { origin: 'http://evil.com' },
    });
    const result = await handler(event);
    expect(result.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('includes CORS headers for admin frontend', async () => {
    const event = makeEvent('GET', '/health', {
      headers: { origin: 'http://localhost:5174' },
    });
    const result = await handler(event);
    expect(result.headers['access-control-allow-origin']).toBe('http://localhost:5174');
  });
});
