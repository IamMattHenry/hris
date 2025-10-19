import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // Handle validation errors
  if (err.array && typeof err.array === 'function') {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.array();
  }

  // Handle database errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW') {
    statusCode = 400;
    message = 'Invalid reference';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

export default { errorHandler, notFoundHandler };

