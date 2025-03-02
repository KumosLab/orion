const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from headers or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }
    
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }
    
    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password. Please log in again.'
      });
    }
    
    // Grant access to protected route
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token. Please log in again.'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Your token has expired. Please log in again.'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Check if user is authenticated for page access
exports.checkAuth = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // Verify token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
      
      // Check if user exists
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.redirect('/index.html');
      }
      
      // Check if user changed password after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.redirect('/index.html');
      }
      
      // User is authenticated, proceed
      return next();
    } catch (err) {
      return res.redirect('/index.html');
    }
  }
  
  // Not authenticated, redirect to login
  res.redirect('/index.html');
};