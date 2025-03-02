// Error handling middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;
  
    // Log error for development
    console.error('ERROR 💥', err);
  
    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const value = err.keyValue[field];
      const message = `Duplicate field value: ${field} with value: ${value}. Please use another value.`;
      error = new Error(message);
      error.statusCode = 400;
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      const message = `Invalid input data. ${errors.join('. ')}`;
      error = new Error(message);
      error.statusCode = 400;
    }
  
    // Mongoose CastError
    if (err.name === 'CastError') {
      const message = `Invalid ${err.path}: ${err.value}`;
      error = new Error(message);
      error.statusCode = 400;
    }
  
    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
      error = new Error('Invalid token. Please log in again.');
      error.statusCode = 401;
    }
  
    if (err.name === 'TokenExpiredError') {
      error = new Error('Your token has expired. Please log in again.');
      error.statusCode = 401;
    }
  
    // Development vs. Production error response
    if (process.env.NODE_ENV === 'development') {
      // In development, send detailed error
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
        error: err,
        stack: error.stack
      });
    } else {
      // In production, send less information
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.statusCode === 500 ? 'Something went wrong on the server. Please try again later.' : error.message
      });
    }
  };
  
  module.exports = errorHandler;