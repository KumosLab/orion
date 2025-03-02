const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const logger = require('../utils/logger');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    logger.info('Connected to MongoDB for cleanup');
    performCleanup();
  })
  .catch(err => {
    logger.error('Failed to connect to MongoDB for cleanup:', { error: err.message });
    process.exit(1);
  });

// Perform database cleanup
const performCleanup = async () => {
  try {
    logger.info('Starting database cleanup...');
    
    // Remove expired challenges (those older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const expiredChallenges = await Challenge.deleteMany({
      createdAt: { $lt: sevenDaysAgo }
    });
    
    logger.info(`Removed ${expiredChallenges.deletedCount} expired challenges`);
    
    // Deactivate challenges with passed expiration date
    const now = new Date();
    
    const deactivatedChallenges = await Challenge.updateMany(
      {
        expiresAt: { $lt: now },
        active: true
      },
      {
        active: false
      }
    );
    
    logger.info(`Deactivated ${deactivatedChallenges.modifiedCount} expired challenges`);
    
    // Any other cleanup tasks can be added here
    
    logger.info('Database cleanup completed successfully');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during database cleanup:', { error: error.message });
    
    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Cleanup process interrupted');
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', { error: error.message });
  }
  
  process.exit(0);
});