const logger = require('../utils/logger');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();

    // Log error
    logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Determine status code (err.status covers errors raised by Express itself, e.g. malformed JSON)
    const statusCode = err.statusCode || err.status || 500;

    // Only expose messages of client errors; server errors get a generic message
    let message = statusCode < 500 ? err.message : 'Internal Server Error';
    if (err.name === 'ValidationError') {
        message = `Validation failed: ${err.message}`;
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            code: err.code || 'UNKNOWN_ERROR',
            timestamp,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

// Error classes
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT');
        this.name = 'RateLimitError';
    }
}

module.exports = {
    errorHandler,
    AppError,
    ValidationError,
    UnauthorizedError,
    NotFoundError,
    RateLimitError
};