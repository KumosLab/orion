const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password in queries
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  languages: {
    type: [String],
    enum: ['python', 'javascript', 'java', 'csharp', 'cpp', 'ruby', 'go', 'php', 'rust', 'swift', 'typescript', 'kotlin', 'css', 'html'],
    default: ['javascript', 'python'],
    validate: [
      {
        validator: function(val) {
          // At least 1 language must be selected
          return val.length > 0;
        },
        message: 'Please select at least one programming language'
      }
    ]
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date,
    default: null
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  completedChallenges: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Challenge',
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // If this is a password change, update the changed timestamp
  if (this.isModified('password') && !this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Small offset to ensure JWT is issued after password change
  }
  
  next();
});

// Method to check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  
  // False means NOT changed
  return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Token expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// Calculate level based on XP
userSchema.pre('save', function(next) {
  if (this.isModified('xp')) {
    // Simple level calculation (adjust as needed)
    this.level = Math.floor(1 + Math.sqrt(this.xp / 100));
  }
  next();
});

// Method to add a completed challenge
userSchema.methods.addCompletedChallenge = function(challengeId) {
  // Check if challenge is already in the array
  if (!this.completedChallenges.includes(challengeId)) {
    this.completedChallenges.push(challengeId);
  }
  return this;
};

// Method to clear game state for today
userSchema.methods.clearGameState = function() {
  this.lastPlayed = null;
  return this;
};

const User = mongoose.model('User', userSchema);

module.exports = User;