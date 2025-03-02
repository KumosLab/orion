// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');

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

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://kumoslab.com' : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Parse cookies - make sure this is before any routes
app.use(cookieParser());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public_html/orion
app.use(express.static(path.join(__dirname, 'public_html', 'orion')));

// Use routes with both /orion prefix and without prefix to support both cPanel and local development
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/orion/api/auth', authRoutes);
app.use('/orion/api/game', gameRoutes);
app.use('/orion/api/users', userRoutes);

// Serve the main application for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public_html', 'orion', 'index.html'));
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
})
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });