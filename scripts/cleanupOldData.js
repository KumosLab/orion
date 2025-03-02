const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const logger = require('../utils/logger');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Error connecting to MongoDB:', { error: error.message });
    process.exit(1);
  }
};

// Connect to the database
connectDB();

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
    
    // Remove challenges that have been completed or failed by users
    // This is a new addition to clean up the database more aggressively
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1); // Keep completed challenges for at least 1 day
    
    const completedOrFailedChallenges = await Challenge.deleteMany({
      $and: [
        { createdAt: { $lt: oneDayAgo } },
        { 
          $or: [
            { completedBy: { $exists: true, $not: { $size: 0 } } },
            { failedBy: { $exists: true, $not: { $size: 0 } } }
          ]
        }
      ]
    });
    
    logger.info(`Removed ${completedOrFailedChallenges.deletedCount} completed or failed challenges`);
    
    // Call the static cleanup method on the Challenge model
    const cleanupResult = await Challenge.cleanup();
    logger.info(`Challenge.cleanup() removed ${cleanupResult.expiredRemoved + cleanupResult.completedRemoved} challenges`);
    
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

// Run the cleanup
performCleanup();

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