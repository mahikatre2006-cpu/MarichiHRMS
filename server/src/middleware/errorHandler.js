import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Error processing ${req.method} ${req.originalUrl}:`, err);

  // 1. Handled AppError
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // 2. Mongoose Invalid ObjectId (CastError)
  if (err.name === 'CastError') {
    return sendError(res, 'INVALID_ID', `Invalid identifier format for field ${err.path}`, 400);
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message
    }));
    return sendError(res, 'VALIDATION_ERROR', 'Model validation failed', 400, details);
  }

  // 4. MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return sendError(res, 'DUPLICATE_RECORD', `A record with this ${field} already exists in the system`, 409);
  }

  // 5. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'INVALID_TOKEN', 'Malformed or invalid authentication token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'TOKEN_EXPIRED', 'Authentication token has expired. Please refresh your session', 401);
  }

  // 6. JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'INVALID_JSON', 'Malformed JSON in request payload', 400);
  }

  // 7. Uncaught / Generic Error
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
  return sendError(res, 'INTERNAL_ERROR', message, 500);
}
