/**
 * Base application error.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @param {*} [details]
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  /** @param {string} message @param {*} [details] */
  constructor(message = 'Bad request', details) {
    super(400, 'BAD_REQUEST', message, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  /** @param {string} message */
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  /** @param {string} message */
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  /** @param {string} message */
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  /** @param {string} message */
  constructor(message = 'Conflict') {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}
