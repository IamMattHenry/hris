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

  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    message = 'Invalid reference';
  }

  // Handle common MySQL truncation/format errors more clearly
  if (err.code === 'ER_TRUNCATED_WRONG_VALUE' || err.code === 'WARN_DATA_TRUNCATED') {
    statusCode = 400;
    const raw = err.sqlMessage || err.message || '';
    // Try to identify which column failed
    const colMatch = raw.match(/column '([^']+)'/i);
    const column = colMatch ? colMatch[1] : undefined;

    if (/Incorrect datetime value/i.test(raw)) {
      message = column
        ? `Invalid date/time format for field '${column}'.`
        : 'Invalid date/time format.';
    } else if (/Data truncated/i.test(raw)) {
      message = column
        ? `Invalid value for field '${column}'.`
        : 'Invalid value provided.';
    } else {
      message = 'Invalid data provided.';
    }
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

