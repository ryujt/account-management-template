import { AppError } from '../utils/errors.js';

/**
 * Express error-handling middleware.
 * Returns structured JSON for AppError instances; logs and returns 500 for others.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) {
      body.error.details = err.details;
    }
    return res.status(err.statusCode).json(body);
  }

  // Unexpected error
  console.error('[unhandled]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

/**
 * Format an error into an API Gateway response object.
 * Suitable for Lambda/API Gateway integrations.
 *
 * @param {Error} err
 * @returns {{ statusCode: number, headers: object, body: string }}
 */
export function formatErrorResponse(err) {
  const headers = { 'Content-Type': 'application/json' };

  if (err instanceof AppError) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) {
      body.error.details = err.details;
    }
    return {
      statusCode: err.statusCode,
      headers,
      body: JSON.stringify(body),
    };
  }

  console.error('[unhandled]', err);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }),
  };
}
