const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  language: {
    type: String,
    required: [true, 'A challenge must have a programming language'],
    enum: ['python', 'javascript', 'java', 'csharp', 'cpp', 'ruby', 'go', 'php', 'rust', 'swift', 'typescript', 'kotlin', 'css', 'html']
  },
  difficulty: {
    type: Number,
    required: [true, 'A challenge must have a difficulty level'],
    min: 1,
    max: 10
  },
  type: {
    type: String,
    required: [true, 'A challenge must have a type'],
    enum: ['fix_bug', 'complete_code', 'explain_output', 'predict_outcome', 'identify_pattern']
  },
  title: {
    type: String,
    required: [true, 'A challenge must have a title']
  },
  prompt: {
    type: String,
    required: [true, 'A challenge must have a prompt']
  },
  codeSnippet: {
    type: String,
    required: [true, 'A challenge must have a code snippet']
  },
  correctAnswer: {
    type: String,
    required: [true, 'A challenge must have a correct answer']
  },
  hints: [String],
  explanation: {
    type: String,
    required: [true, 'A challenge must have an explanation']
  },
  xpReward: {
    type: Number,
    required: [true, 'A challenge must have an XP reward'],
    min: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: [true, 'A challenge must have an expiration date']
  },
  active: {
    type: Boolean,
    default: true
  },
  seed: {
    type: String,
    default: null
  },
  completedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  failedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expirationDate: {
    type: Date
  }
});

// Index for faster queries
challengeSchema.index({ language: 1, difficulty: 1, active: 1 });
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic deletion
challengeSchema.index({ completedBy: 1 });
challengeSchema.index({ failedBy: 1 });
challengeSchema.index({ expirationDate: 1 });

// Static method to get challenges appropriate for a user's level
challengeSchema.statics.getByUserLevel = async function(languages, level) {
  // Calculate an appropriate difficulty range based on user level
  const minDifficulty = Math.max(1, level - 2);
  const maxDifficulty = Math.min(10, level + 2);
  
  // Find active challenges that match the user's languages and difficulty level
  const challenges = await this.find({
    language: { $in: languages },
    difficulty: { $gte: minDifficulty, $lte: maxDifficulty },
    active: true,
    expiresAt: { $gt: new Date() }
  }).limit(10);
  
  // If no challenges found, fall back to lower difficulty
  if (challenges.length === 0) {
    return this.find({
      language: { $in: languages },
      active: true,
      expiresAt: { $gt: new Date() }
    }).sort({ difficulty: 1 }).limit(5);
  }
  
  return challenges;
};

// Static method to cleanup old challenges
challengeSchema.statics.cleanup = async function() {
  const now = new Date();
  
  // Delete expired challenges
  const expiredResult = await this.deleteMany({
    expirationDate: { $lt: now }
  });
  
  // Delete challenges that are older than 24 hours and have been completed or failed
  const oneDayAgo = new Date(now);
  oneDayAgo.setHours(now.getHours() - 24);
  
  const completedResult = await this.deleteMany({
    createdAt: { $lt: oneDayAgo },
    $or: [
      { completedBy: { $exists: true, $not: { $size: 0 } } },
      { failedBy: { $exists: true, $not: { $size: 0 } } }
    ]
  });
  
  return {
    expiredRemoved: expiredResult.deletedCount,
    completedRemoved: completedResult.deletedCount
  };
};

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;