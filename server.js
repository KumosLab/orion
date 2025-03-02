// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/authRoutes.js');
const gameRoutes = require('./routes/gameRoutes.js');
const userRoutes = require('./routes/userRoutes.js');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import challenge generator
const { generateChallenges } = require('./scripts/generateChallenges');

// Create Express app
const app = express();

// Create a server status file that can be checked externally
const SERVER_STATUS_FILE = path.join(__dirname, 'server-status.json');
function updateServerStatus(status = 'running', details = {}) {
  const statusData = {
    status,
    lastUpdated: new Date().toISOString(),
    uptime: process.uptime(),
    ...details
  };
  
  fs.writeFileSync(SERVER_STATUS_FILE, JSON.stringify(statusData, null, 2));
  return statusData;
}

// Initialize server status
updateServerStatus('starting');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity
  crossOriginEmbedderPolicy: false // Allow embedding
}));

// Rate limiting - LESS AGGRESSIVE
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 300 to 500
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/health' || req.path === '/api/health';
  }
});
app.use(limiter);

// Parse cookies - make sure this is before any routes
app.use(cookieParser());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve static files from public_html/orion
app.use(express.static(path.join(__dirname, 'public_html', 'orion')));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log(`[DEBUG] Origin: ${req.headers.origin || 'No origin'}`);
  
  // Don't log all headers for every request (too verbose)
  if (req.method === 'OPTIONS' || req.path.includes('/auth/')) {
    console.log(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
  }
  
  // Log response headers after they're set (for CORS debugging)
  const originalSend = res.send;
  res.send = function(...args) {
    if (req.method === 'OPTIONS' || req.path.includes('/auth/')) {
      console.log('[DEBUG] Response headers:', res.getHeaders());
    }
    return originalSend.apply(res, args);
  };
  
  next();
});

// Enhanced health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  }[mongoStatus] || 'unknown';
  
  const memoryUsage = process.memoryUsage();
  
  const healthcheck = {
    status: mongoStatus === 1 ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: Date.now(),
    mongoConnection: mongoStatusText,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    },
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Update server status file
  updateServerStatus(healthcheck.status, healthcheck);
  
  res.status(200).json(healthcheck);
});

// Test route to verify server is responding
app.get(['/test', '/api/test'], (req, res) => {
  console.log('Test endpoint accessed');
  console.log('Request headers:', req.headers);
  
  res.json({
    message: 'API is working correctly',
    cors: 'Headers should be present in the response',
    origin: req.headers.origin || 'No origin header found',
    timestamp: new Date().toISOString()
  });
});

// Add a test endpoint for CORS preflight
app.options(['/test', '/api/test'], (req, res) => {
  console.log('OPTIONS request received for test endpoint');
  console.log('Request headers:', req.headers);
  
  res.status(204).end();
});

// Debug route for auth/check
app.get(['/debug-auth-check', '/api/debug-auth-check'], (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Debug auth check route is working',
    cookies: req.cookies
  });
});

// Debug route for auth/login
app.post(['/debug-auth-login', '/api/debug-auth-login'], (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Debug auth login route is working',
    body: req.body
  });
});

// Register routes - SIMPLIFIED AND CLEAR
// Direct routes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/users', userRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/users', userRoutes);

// Development routes
app.use('/orion/api/auth', authRoutes);
app.use('/orion/api/game', gameRoutes);
app.use('/orion/api/users', userRoutes);

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
    availableEndpoints: [
      '/health', '/api/health',
      '/test', '/api/test',
      '/auth/*', '/api/auth/*',
      '/game/*', '/api/game/*',
      '/users/*', '/api/users/*'
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

// Schedule daily challenge generation (midnight GMT)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Generating new daily challenges...');
    await generateChallenges();
    console.log('Daily challenges generated successfully');
  } catch (error) {
    console.error('Error generating challenges:', error);
  }
}, {
  timezone: 'GMT'
});

// Improved MongoDB connection with retry logic and exponential backoff
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 20; // Maximum number of retry attempts
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

function connectToMongoDB() {
  connectionAttempts++;
  const retryDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(1.5, connectionAttempts - 1), 60000); // Max 1 minute
  
  console.log(`MongoDB connection attempt ${connectionAttempts}...`);
  updateServerStatus('connecting', { mongoStatus: 'connecting', connectionAttempts });
  
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000, // 45 seconds
    keepAlive: true,
    keepAliveInitialDelay: 300000, // 5 minutes
    heartbeatFrequencyMS: 10000, // 10 seconds (default is 30 seconds)
    family: 4 // Force IPv4
  })
    .then(() => {
      console.log('Connected to MongoDB');
      connectionAttempts = 0; // Reset counter on successful connection
      updateServerStatus('running', { mongoStatus: 'connected' });
      
      // Start the server
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      
      if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying connection in ${retryDelay/1000} seconds...`);
        updateServerStatus('degraded', { 
          mongoStatus: 'connection_failed', 
          error: err.message,
          nextRetry: new Date(Date.now() + retryDelay).toISOString(),
          attemptsRemaining: MAX_RETRY_ATTEMPTS - connectionAttempts
        });
        
        setTimeout(connectToMongoDB, retryDelay);
      } else {
        console.error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached. Giving up.`);
        updateServerStatus('failed', { 
          mongoStatus: 'connection_failed',
          error: err.message,
          message: 'Maximum retry attempts reached'
        });
        
        // Start the server anyway to serve the status endpoint
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
          console.log(`Server running on port ${PORT} in DEGRADED mode (no database)`);
        });
      }
    });
}

// Handle MongoDB disconnection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Attempting to reconnect...');
  updateServerStatus('degraded', { mongoStatus: 'disconnected' });
  
  // Only attempt reconnection if we're not already in the process
  if (connectionAttempts === 0) {
    connectionAttempts = 1; // Reset to first attempt
    setTimeout(connectToMongoDB, INITIAL_RETRY_DELAY);
  }
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  updateServerStatus('degraded', { mongoStatus: 'error', error: err.message });
  
  // Only disconnect if we're currently connected
  if (mongoose.connection.readyState === 1) {
    mongoose.disconnect(); // Will trigger the 'disconnected' event
  }
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
  updateServerStatus('running', { mongoStatus: 'connected' });
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
  updateServerStatus('running', { mongoStatus: 'reconnected' });
});

// Start the connection process
connectToMongoDB();

// Handle process termination gracefully
process.on('SIGINT', () => {
  updateServerStatus('shutting_down');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  updateServerStatus('error', { error: err.message, stack: err.stack });
  
  // Keep the process running but log the error
  // This is safer than crashing in production
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  updateServerStatus('warning', { warning: 'Unhandled promise rejection', details: String(reason) });
  
  // Keep the process running but log the error
});