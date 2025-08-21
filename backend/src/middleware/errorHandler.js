const config = require('../config/config');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found handler
const notFound = (req, res, next) => {
  const error = new AppError(`Resource not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? { id: req.user.user_id, email: req.user.email } : null,
    timestamp: new Date().toISOString()
  });

  // MySQL/Database errors
  if (error.code) {
    if (error.code === 'ER_DUP_ENTRY') {
      const field = error.message.match(/for key '(.+?)'/)?.[1] || 'unknown';
      error = new AppError(`Duplicate entry for ${field}`, 409, 'DUPLICATE_ENTRY');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      error = new AppError('Referenced record not found', 400, 'REFERENCE_ERROR');
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      error = new AppError('Cannot delete record due to existing references', 409, 'REFERENCE_CONFLICT');
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      error = new AppError('Data too long for database field', 400, 'DATA_TOO_LONG');
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      error = new AppError('Required field cannot be null', 400, 'NULL_VALUE_ERROR');
    } else if (error.code.startsWith('ER_')) {
      error = new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  } else if (error.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  } else if (error.name === 'NotBeforeError') {
    error = new AppError('Token not active yet', 401, 'TOKEN_NOT_ACTIVE');
  }

  // Validation errors from express-validator
  if (error.name === 'ValidationError' || (error.errors && Array.isArray(error.errors))) {
    const validationErrors = error.errors?.map(err => ({
      field: err.path || err.field,
      message: err.message,
      value: err.value
    })) || [];
    
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationErrors);
  }

  // Multer errors (file upload)
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File too large', 413, 'FILE_TOO_LARGE');
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
    } else {
      error = new AppError('File upload error', 400, 'UPLOAD_ERROR');
    }
  }

  // Rate limiting errors
  if (error.name === 'RateLimitError' || error.statusCode === 429) {
    error = new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED', {
      retryAfter: error.retryAfter || 60
    });
  }

  // Syntax and type errors
  if (error.name === 'SyntaxError') {
    error = new AppError('Invalid JSON format', 400, 'INVALID_JSON');
  } else if (error.name === 'TypeError' && error.message.includes('Cannot read property')) {
    error = new AppError('Missing required data', 400, 'MISSING_DATA');
  }

  // Connection errors
  if (error.code === 'ECONNREFUSED') {
    error = new AppError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
  } else if (error.code === 'ETIMEDOUT') {
    error = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.isOperational ? error.message : 'Something went wrong';

  // Prepare error response
  const errorResponse = {
    error: errorCode,
    message: message,
    timestamp: error.timestamp || new Date().toISOString()
  };

  // Add details in development mode or for client errors
  if (config.env === 'development' || statusCode < 500) {
    if (error.details) {
      errorResponse.details = error.details;
    }
    
    if (config.env === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.originalError = {
        name: err.name,
        message: err.message
      };
    }
  }

  // Add request ID if available
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to avoid try-catch in route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Success response helper
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

// Paginated response helper
const sendPaginatedResponse = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  });
};

// Error response helper
const sendError = (res, message, statusCode = 400, code = null, details = null) => {
  const error = new AppError(message, statusCode, code, details);
  const response = {
    error: error.code || 'CLIENT_ERROR',
    message: error.message,
    timestamp: error.timestamp
  };

  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Generate request ID
  req.requestId = require('crypto').randomBytes(8).toString('hex');
  
  // Log request start
  console.log(`[${new Date().toISOString()}] ${req.requestId} - ${req.method} ${req.originalUrl} - Start`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? { id: req.user.user_id, email: req.user.email } : null
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.requestId} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    return originalJson(body);
  };

  next();
};

// Health check helper
const healthCheck = async (req, res) => {
  try {
    const database = require('../config/database');
    
    // Check database connection
    await database.getPool().execute('SELECT 1');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: config.env,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected'
      }
    };

    res.status(200).json(health);
  } catch (error) {
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'disconnected'
      }
    };

    res.status(503).json(health);
  }
};

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
  sendSuccess,
  sendPaginatedResponse,
  sendError,
  requestLogger,
  healthCheck
};