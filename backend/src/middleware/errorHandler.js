function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.isOperational) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  res.status(500).json({
    error: {
      code: 'InternalServerError',
      message: 'An unexpected error occurred',
      details: {}
    }
  });
}

module.exports = errorHandler;