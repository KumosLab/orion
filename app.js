// Load environment variables
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Import middleware
const { checkAuth } = require('./middleware/auth');

// Create Express app
const app = express();

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'api.openai.com', process.env.MONGODB_URI]
    }
  }
}));

// Compress responses
app.use(compression());

// Parse cookies - make sure this is before any routes
app.use(cookieParser());

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Serve static files
app.use(express.static(path.join(__dirname, 'public_html')));

// Add CORS headers for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Protected routes middleware
app.use('/game.html', checkAuth);
app.use('/settings.html', checkAuth);
app.use('/leaderboard.html', checkAuth);

// Expose app for server.js
module.exports = app;