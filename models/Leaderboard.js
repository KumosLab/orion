const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Leaderboard entry must belong to a user']
  },
  username: {
    type: String,
    required: [true, 'Leaderboard entry must have a username']
  },
  xp: {
    type: Number,
    required: [true, 'Leaderboard entry must have an XP value']
  },
  level: {
    type: Number,
    required: [true, 'Leaderboard entry must have a level']
  },
  wins: {
    type: Number,
    required: [true, 'Leaderboard entry must have win count'],
    default: 0
  },
  streak: {
    type: Number,
    required: [true, 'Leaderboard entry must have streak count'],
    default: 0
  },
  rank: {
    type: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Index for faster querying and sorting
leaderboardSchema.index({ xp: -1, wins: -1, streak: -1 });
leaderboardSchema.index({ user: 1 }, { unique: true });

// Static method to update user's leaderboard entry
leaderboardSchema.statics.updateEntry = async function(userId, userData) {
  return this.findOneAndUpdate(
    { user: userId },
    {
      username: userData.username,
      xp: userData.xp,
      level: userData.level,
      wins: userData.wins,
      streak: userData.streak,
      lastUpdated: Date.now()
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );
};

// Static method to get top leaderboard entries
leaderboardSchema.statics.getTop = async function(limit = 100) {
  const entries = await this.find()
    .sort({ xp: -1, wins: -1, streak: -1 })
    .limit(limit);
    
  // Calculate ranks
  return entries.map((entry, index) => {
    entry.rank = index + 1;
    return entry;
  });
};

// Static method to get a user's rank
leaderboardSchema.statics.getUserRank = async function(userId) {
  const userEntry = await this.findOne({ user: userId });
  
  if (!userEntry) return null;
  
  // Count how many users have more XP
  const betterRanks = await this.countDocuments({
    $or: [
      { xp: { $gt: userEntry.xp } },
      { xp: userEntry.xp, wins: { $gt: userEntry.wins } },
      { xp: userEntry.xp, wins: userEntry.wins, streak: { $gt: userEntry.streak } }
    ]
  });
  
  return {
    ...userEntry.toObject(),
    rank: betterRanks + 1
  };
};

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard;