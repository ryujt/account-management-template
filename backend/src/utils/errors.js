class AppError extends Error {
  constructor(message, code, status, details = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }
}

class BadRequestError extends AppError {
  constructor(message, details = {}) {
    super(message, 'BadRequest', 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = {}) {
    super(message, 'Unauthorized', 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = {}) {
    super(message, 'Forbidden', 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found', details = {}) {
    super(message, 'NotFound', 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details = {}) {
    super(message, 'Conflict', 409, details);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details = {}) {
    super(message, 'InternalServerError', 500, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError
};