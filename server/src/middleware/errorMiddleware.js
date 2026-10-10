/**
 * Centralized Resilient Error Handling Middleware
 * Prevents server crashes on bad requests, unhandled errors, and database drops.
 */

function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

function errorHandler(err, req, res, next) {
  // If headers were already sent, delegate to default Express error handler to prevent ERR_HTTP_HEADERS_SENT crash
  if (res.headersSent) {
    return next(err);
  }

  // Handle body-parser malformed JSON errors gracefully
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received in request body.',
    });
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errorDetails = err.errors ? err.errors.map((e) => e.message) : [err.message];
    return res.status(400).json({
      success: false,
      message: errorDetails.join(', '),
      errors: errorDetails,
    });
  }

  // Handle temporary Database disconnection errors
  if (
    err.name === 'SequelizeConnectionError' ||
    err.name === 'SequelizeConnectionRefusedError' ||
    err.name === 'SequelizeHostNotFoundError' ||
    err.code === 'PROTOCOL_CONNECTION_LOST' ||
    err.code === 'ECONNRESET'
  ) {
    console.error('🚨 [Database Error Caught Safely]:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database service is temporarily unavailable. Auto-reconnecting...',
    });
  }

  // Handle CORS rejection errors
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  // Determine status code safely
  let statusCode = 500;
  if (typeof res.statusCode === 'number' && res.statusCode >= 400 && res.statusCode < 600) {
    statusCode = res.statusCode;
  } else if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  }

  // Log error stack safely in non-production or for 500s
  if (statusCode >= 500) {
    console.error(`🚨 [500 Error at ${req.method} ${req.originalUrl}]:`, err?.message || err);
  }

  return res.status(statusCode).json({
    success: false,
    message: err?.message || 'An unexpected internal server error occurred.',
    stack: process.env.NODE_ENV === 'production' ? null : err?.stack,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
