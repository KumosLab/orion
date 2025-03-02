const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

// Get current user data
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Update user languages
exports.updateLanguages = async (req, res, next) => {
  try {
    const { languages } = req.body;
    
    // Validate languages - remove upper limit
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please select at least one programming language'
      });
    }
    
    // Validate language values
    const validLanguages = ['python', 'javascript', 'java', 'csharp', 'cpp', 'ruby', 'go', 'php', 'rust', 'swift', 'typescript', 'kotlin', 'css', 'html'];
    const invalidLanguages = languages.filter(lang => !validLanguages.includes(lang));
    
    if (invalidLanguages.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid language(s): ${invalidLanguages.join(', ')}`
      });
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { languages },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          languages: updatedUser.languages
        }
      }
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        status: 'fail',
        message: errors.join('. ')
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Update user profile (username, email)
exports.updateProfile = async (req, res, next) => {
  try {
    // Filter out unwanted fields
    const filteredBody = filterObj(req.body, 'username', 'email');
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // If username is updated, update leaderboard entry
    if (filteredBody.username) {
      await Leaderboard.findOneAndUpdate(
        { user: req.user.id },
        { username: filteredBody.username }
      );
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          username: updatedUser.username,
          email: updatedUser.email
        }
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        status: 'fail',
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        status: 'fail',
        message: errors.join('. ')
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Delete user account
exports.deleteAccount = async (req, res, next) => {
  try {
    // Soft delete by setting active to false
    await User.findByIdAndUpdate(req.user.id, { active: false });
    
    // Remove from leaderboard
    await Leaderboard.findOneAndDelete({ user: req.user.id });
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Helper function to filter allowed fields
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};