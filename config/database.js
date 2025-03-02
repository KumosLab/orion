const mongoose = require('mongoose');

// MongoDB connection options
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, dbOptions);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Add additional MongoDB event handlers
    mongoose.connection.on('error', err => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Graceful shutdown on process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;