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
