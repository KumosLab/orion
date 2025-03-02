/**
 * View Recent Challenges
 * 
 * This script connects to the MongoDB database and displays the most recent challenges.
 * It's useful for verifying that challenges are being generated correctly.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  viewChallenges();
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

// Function to view recent challenges
async function viewChallenges() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limit = args.includes('--limit') ? 
      parseInt(args[args.indexOf('--limit') + 1]) : 5;
    const language = args.includes('--language') ? 
      args[args.indexOf('--language') + 1] : null;
    const difficulty = args.includes('--difficulty') ? 
      args[args.indexOf('--difficulty') + 1] : null;
    const exportFlag = args.includes('--export');
    
    // Build query
    const query = {};
    if (language) query.language = language;
    if (difficulty) query.difficultyLevel = difficulty;
    
    // Get challenges
    const challenges = await Challenge.find(query)
      .sort({ dateCreated: -1 })
      .limit(limit);
    
    if (challenges.length === 0) {
      console.log('No challenges found matching the criteria.');
      process.exit(0);
    }
    
    console.log(`Found ${challenges.length} challenges:`);
    console.log('='.repeat(50));
    
    // Display challenges
    challenges.forEach((challenge, index) => {
      console.log(`Challenge #${index + 1}:`);
      console.log(`Title: ${challenge.title}`);
      console.log(`Language: ${challenge.language}`);
      console.log(`Difficulty: ${challenge.difficultyLevel}`);
      console.log(`Type: ${challenge.type}`);
      console.log(`XP Reward: ${challenge.xpReward}`);
      console.log(`Created: ${challenge.dateCreated.toLocaleString()}`);
      console.log(`Scheduled: ${challenge.dateScheduled ? challenge.dateScheduled.toLocaleString() : 'Not scheduled'}`);
      console.log(`Active: ${challenge.isActive ? 'Yes' : 'No'}`);
      console.log('='.repeat(50));
    });
    
    // Export challenges if requested
    if (exportFlag) {
      const exportDir = path.join(__dirname, 'exported-challenges');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
      }
      
      const filename = path.join(exportDir, `challenges-export-${Date.now()}.json`);
      fs.writeFileSync(filename, JSON.stringify(challenges, null, 2));
      console.log(`Challenges exported to: ${filename}`);
    }
    
    // Display usage information
    console.log(`
Usage:
  node viewRecentChallenges.js [options]

Options:
  --limit N        Show N most recent challenges (default: 5)
  --language LANG  Filter by programming language
  --difficulty LVL Filter by difficulty level (easy, medium, hard)
  --export         Export challenges to JSON file
    `);
    
  } catch (error) {
    console.error('Error viewing challenges:', error);
  } finally {
    mongoose.disconnect();
  }
} 