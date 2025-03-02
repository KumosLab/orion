/**
 * Activate Daily Challenges
 * 
 * This script selects challenges from the database and activates them for the day.
 * It selects one challenge for each difficulty level (easy, medium, hard) and
 * marks them as active for today's challenges.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  activateChallenges();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define Challenge Schema
const challengeSchema = new mongoose.Schema({
  title: String,
  prompt: String,
  codeSnippet: String,
  correctAnswer: String,
  hints: [String],
  explanation: String,
  testCases: [{
    input: String,
    output: String
  }],
  constraints: [String],
  timeComplexity: String,
  spaceComplexity: String,
  difficultyLevel: String,
  language: String,
  type: String,
  xpReward: Number,
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateScheduled: Date,
  isActive: {
    type: Boolean,
    default: false
  }
});

// Create Challenge model
const Challenge = mongoose.model('Challenge', challengeSchema);

// Function to activate challenges
async function activateChallenges() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const forceFlag = args.includes('--force');
    const date = args.includes('--date') ? 
      new Date(args[args.indexOf('--date') + 1]) : new Date();
    
    // Format date for display and query
    const formattedDate = date.toISOString().split('T')[0];
    
    // Check if challenges are already active for today
    const activeCount = await Challenge.countDocuments({
      isActive: true,
      dateScheduled: {
        $gte: new Date(formattedDate),
        $lt: new Date(new Date(formattedDate).setDate(date.getDate() + 1))
      }
    });
    
    if (activeCount > 0 && !forceFlag) {
      console.log(`There are already ${activeCount} active challenges for ${formattedDate}.`);
      console.log('Use --force to deactivate them and select new ones.');
      process.exit(0);
    }
    
    // Deactivate any currently active challenges
    if (activeCount > 0) {
      console.log(`Deactivating ${activeCount} currently active challenges...`);
      await Challenge.updateMany({ isActive: true }, { isActive: false });
    }
    
    // Select one challenge for each difficulty level
    const difficulties = ['easy', 'medium', 'hard'];
    const activatedChallenges = [];
    
    for (const difficulty of difficulties) {
      // Find challenges that haven't been scheduled yet or were scheduled more than 30 days ago
      const challenge = await Challenge.findOne({
        difficultyLevel: difficulty,
        $or: [
          { dateScheduled: { $exists: false } },
          { dateScheduled: null },
          { dateScheduled: { $lt: new Date(new Date().setDate(date.getDate() - 30)) } }
        ]
      }).sort({ dateCreated: -1 });
      
      if (challenge) {
        // Activate the challenge
        challenge.isActive = true;
        challenge.dateScheduled = date;
        await challenge.save();
        
        activatedChallenges.push({
          id: challenge._id,
          title: challenge.title,
          difficulty: challenge.difficultyLevel,
          language: challenge.language
        });
        
        console.log(`Activated ${difficulty} challenge: ${challenge.title}`);
      } else {
        console.log(`No available ${difficulty} challenges found.`);
      }
    }
    
    console.log(`\nActivated ${activatedChallenges.length} challenges for ${formattedDate}:`);
    activatedChallenges.forEach((challenge, index) => {
      console.log(`${index + 1}. ${challenge.title} (${challenge.difficulty}, ${challenge.language})`);
    });
    
    // Display usage information
    console.log(`
Usage:
  node activateDailyChallenges.js [options]

Options:
  --force         Force activation even if challenges are already active
  --date DATE     Activate challenges for a specific date (YYYY-MM-DD)
    `);
    
  } catch (error) {
    console.error('Error activating challenges:', error);
  } finally {
    mongoose.disconnect();
  }
} 