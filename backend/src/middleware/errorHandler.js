const { AppError } = require('../utils/errors');

/**
 * Development error response
 */
const sendDevError = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: 'error',
    error: err,
    message: err.message,
    stack: err.stack,
    code: err.code || null
  });
};

/**
 * Production error response
 */
const sendProdError = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.message,
      code: err.code || null
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Handle Sequelize validation errors
 */
const handleSequelizeValidationError = (err) => {
  const errors = err.errors.map(error => ({
    field: error.path,
    message: error.message,
    value: error.value
  }));

  const message = 'Validation failed';
  return new AppError(message, 400, 'VALIDATION_ERROR', errors);
};

/**
 * Handle Sequelize unique constraint errors
 */
const handleSequelizeUniqueConstraintError = (err) => {
  const field = err.errors[0]?.path || 'field';
  const message = `${field} already exists`;
  return new AppError(message, 409, 'DUPLICATE_FIELD');
};

/**
 * Handle Sequelize foreign key constraint errors
 */
const handleSequelizeForeignKeyConstraintError = (err) => {
  const message = 'Invalid reference to related resource';
  return new AppError(message, 400, 'FOREIGN_KEY_CONSTRAINT');
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Handle MySQL connection errors
 */
const handleMySQLConnectionError = (err) => {
  let message = 'Database connection failed';
  
  if (err.code === 'ECONNREFUSED') {
    message = 'Database server is not available';
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    message = 'Database access denied';
  } else if (err.code === 'ER_BAD_DB_ERROR') {
    message = 'Database does not exist';
  }
  
  return new AppError(message, 503, 'DATABASE_ERROR');
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    error = handleSequelizeValidationError(error);
  }
  
  // Sequelize unique constraint error
  else if (err.name === 'SequelizeUniqueConstraintError') {
    error = handleSequelizeUniqueConstraintError(error);
  }
  
  // Sequelize foreign key constraint error
  else if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = handleSequelizeForeignKeyConstraintError(error);
  }
  
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }
  
  // MySQL connection errors
  else if (err.code && err.code.startsWith('E') || err.code && err.code.startsWith('ER_')) {
    error = handleMySQLConnectionError(err);
  }

  // Send error response
  if (process.env.APP_ENV === 'development') {
    sendDevError(error, res);
  } else {
    sendProdError(error, res);
  }
};

/**
 * Handle unhandled routes
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND');
  next(err);
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};