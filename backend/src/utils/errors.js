/**
 * Custom error classes for the application
 */

class BaseError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Authentication & Authorization Errors
class AuthenticationError extends BaseError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

class AuthorizationError extends BaseError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

class TokenExpiredError extends BaseError {
  constructor(message = 'Token has expired', details = null) {
    super(message, 401, 'TOKEN_EXPIRED', details);
  }
}

class InvalidTokenError extends BaseError {
  constructor(message = 'Invalid token', details = null) {
    super(message, 401, 'INVALID_TOKEN', details);
  }
}

// Validation Errors
class ValidationError extends BaseError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class InvalidInputError extends BaseError {
  constructor(message = 'Invalid input provided', details = null) {
    super(message, 400, 'INVALID_INPUT', details);
  }
}

// Resource Errors
class NotFoundError extends BaseError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends BaseError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class DuplicateError extends BaseError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} already exists`, 409, 'DUPLICATE', details);
  }
}

// Database Errors
class DatabaseError extends BaseError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class DatabaseConnectionError extends BaseError {
  constructor(message = 'Database connection failed', details = null) {
    super(message, 503, 'DATABASE_CONNECTION_ERROR', details);
  }
}

// Rate Limiting Errors
class RateLimitError extends BaseError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60, details = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

// Service Errors
class ServiceUnavailableError extends BaseError {
  constructor(service = 'Service', details = null) {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

class ExternalServiceError extends BaseError {
  constructor(service = 'External service', message = 'External service error', details = null) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

// Business Logic Errors
class BusinessLogicError extends BaseError {
  constructor(message = 'Business logic error', details = null) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', details);
  }
}

class InsufficientPermissionsError extends BaseError {
  constructor(permission = 'permission', details = null) {
    super(`Insufficient permissions: ${permission} required`, 403, 'INSUFFICIENT_PERMISSIONS', details);
  }
}

class AccountDisabledError extends BaseError {
  constructor(details = null) {
    super('Account is disabled', 403, 'ACCOUNT_DISABLED', details);
  }
}

class EmailNotVerifiedError extends BaseError {
  constructor(details = null) {
    super('Email address not verified', 403, 'EMAIL_NOT_VERIFIED', details);
  }
}

// File/Upload Errors
class FileUploadError extends BaseError {
  constructor(message = 'File upload failed', details = null) {
    super(message, 400, 'FILE_UPLOAD_ERROR', details);
  }
}

class FileSizeError extends BaseError {
  constructor(maxSize = 'allowed size', details = null) {
    super(`File size exceeds ${maxSize}`, 413, 'FILE_SIZE_ERROR', details);
  }
}

class FileTypeError extends BaseError {
  constructor(allowedTypes = 'allowed types', details = null) {
    super(`File type not allowed. Allowed types: ${allowedTypes}`, 415, 'FILE_TYPE_ERROR', details);
  }
}

// Network/Communication Errors
class NetworkError extends BaseError {
  constructor(message = 'Network error occurred', details = null) {
    super(message, 503, 'NETWORK_ERROR', details);
  }
}

class TimeoutError extends BaseError {
  constructor(operation = 'Operation', timeout = 'specified time', details = null) {
    super(`${operation} timed out after ${timeout}`, 408, 'TIMEOUT_ERROR', details);
  }
}

// Configuration Errors
class ConfigurationError extends BaseError {
  constructor(setting = 'Configuration setting', details = null) {
    super(`Invalid or missing configuration: ${setting}`, 500, 'CONFIGURATION_ERROR', details);
  }
}

// Session Errors
class SessionError extends BaseError {
  constructor(message = 'Session error', details = null) {
    super(message, 401, 'SESSION_ERROR', details);
  }
}

class SessionExpiredError extends BaseError {
  constructor(details = null) {
    super('Session has expired', 401, 'SESSION_EXPIRED', details);
  }
}

// Password Errors
class PasswordError extends BaseError {
  constructor(message = 'Password error', details = null) {
    super(message, 400, 'PASSWORD_ERROR', details);
  }
}

class WeakPasswordError extends BaseError {
  constructor(requirements = 'password requirements', details = null) {
    super(`Password does not meet ${requirements}`, 400, 'WEAK_PASSWORD', details);
  }
}

class PasswordMismatchError extends BaseError {
  constructor(details = null) {
    super('Password confirmation does not match', 400, 'PASSWORD_MISMATCH', details);
  }
}

// Email Errors
class EmailError extends BaseError {
  constructor(message = 'Email error', details = null) {
    super(message, 400, 'EMAIL_ERROR', details);
  }
}

class InvalidEmailError extends BaseError {
  constructor(email = 'provided email', details = null) {
    super(`Invalid email format: ${email}`, 400, 'INVALID_EMAIL', details);
  }
}

class EmailAlreadyExistsError extends BaseError {
  constructor(email = 'Email', details = null) {
    super(`${email} is already registered`, 409, 'EMAIL_ALREADY_EXISTS', details);
  }
}

// Error Factory
class ErrorFactory {
  static create(type, message, details = null) {
    const errorClasses = {
      AUTHENTICATION: AuthenticationError,
      AUTHORIZATION: AuthorizationError,
      TOKEN_EXPIRED: TokenExpiredError,
      INVALID_TOKEN: InvalidTokenError,
      VALIDATION: ValidationError,
      INVALID_INPUT: InvalidInputError,
      NOT_FOUND: NotFoundError,
      CONFLICT: ConflictError,
      DUPLICATE: DuplicateError,
      DATABASE: DatabaseError,
      DATABASE_CONNECTION: DatabaseConnectionError,
      RATE_LIMIT: RateLimitError,
      SERVICE_UNAVAILABLE: ServiceUnavailableError,
      EXTERNAL_SERVICE: ExternalServiceError,
      BUSINESS_LOGIC: BusinessLogicError,
      INSUFFICIENT_PERMISSIONS: InsufficientPermissionsError,
      ACCOUNT_DISABLED: AccountDisabledError,
      EMAIL_NOT_VERIFIED: EmailNotVerifiedError,
      FILE_UPLOAD: FileUploadError,
      FILE_SIZE: FileSizeError,
      FILE_TYPE: FileTypeError,
      NETWORK: NetworkError,
      TIMEOUT: TimeoutError,
      CONFIGURATION: ConfigurationError,
      SESSION: SessionError,
      SESSION_EXPIRED: SessionExpiredError,
      PASSWORD: PasswordError,
      WEAK_PASSWORD: WeakPasswordError,
      PASSWORD_MISMATCH: PasswordMismatchError,
      EMAIL: EmailError,
      INVALID_EMAIL: InvalidEmailError,
      EMAIL_ALREADY_EXISTS: EmailAlreadyExistsError
    };

    const ErrorClass = errorClasses[type] || BaseError;
    return new ErrorClass(message, details);
  }

  static fromDatabaseError(error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return new DuplicateError('Duplicate entry', { originalError: error.message });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return new ValidationError('Referenced record not found', { originalError: error.message });
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return new ConflictError('Cannot delete record due to existing references', { originalError: error.message });
    }

    if (error.code === 'ER_DATA_TOO_LONG') {
      return new ValidationError('Data too long for database field', { originalError: error.message });
    }

    if (error.code === 'ER_BAD_NULL_ERROR') {
      return new ValidationError('Required field cannot be null', { originalError: error.message });
    }

    if (error.code === 'ECONNREFUSED') {
      return new DatabaseConnectionError('Database connection refused', { originalError: error.message });
    }

    if (error.code === 'ETIMEDOUT') {
      return new TimeoutError('Database operation', 'connection timeout', { originalError: error.message });
    }

    return new DatabaseError('Database operation failed', { originalError: error.message });
  }
}

// Error Handler Helper
class ErrorHandler {
  static handle(error, req = null) {
    // Log error with context
    const context = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    };

    if (req) {
      context.request = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? { id: req.user.user_id, email: req.user.email } : null
      };
    }

    console.error('Error occurred:', context);

    // Return sanitized error for response
    return {
      error: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.isOperational ? error.message : 'An unexpected error occurred',
      statusCode: error.statusCode || 500,
      timestamp: error.timestamp || new Date().toISOString(),
      ...(error.details && { details: error.details })
    };
  }

  static isOperational(error) {
    return error.isOperational === true;
  }
}

module.exports = {
  BaseError,
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError,
  InvalidTokenError,
  ValidationError,
  InvalidInputError,
  NotFoundError,
  ConflictError,
  DuplicateError,
  DatabaseError,
  DatabaseConnectionError,
  RateLimitError,
  ServiceUnavailableError,
  ExternalServiceError,
  BusinessLogicError,
  InsufficientPermissionsError,
  AccountDisabledError,
  EmailNotVerifiedError,
  FileUploadError,
  FileSizeError,
  FileTypeError,
  NetworkError,
  TimeoutError,
  ConfigurationError,
  SessionError,
  SessionExpiredError,
  PasswordError,
  WeakPasswordError,
  PasswordMismatchError,
  EmailError,
  InvalidEmailError,
  EmailAlreadyExistsError,
  ErrorFactory,
  ErrorHandler
};