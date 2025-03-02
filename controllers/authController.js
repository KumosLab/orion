const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper: Create and send JWT token
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  try {
    const token = signToken(user._id);
    console.log('Token generated for user:', user.username);

    // Remove password from output
    user.password = undefined;

    // Set cookie options
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    };
    
    console.log('Setting cookie with options:', cookieOptions);

    res.cookie('jwt', token, cookieOptions);
    console.log('Cookie set successfully');

    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error in createSendToken:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating authentication token'
    });
  }
};

// Register a new user
exports.signup = async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword, languages } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Passwords do not match'
      });
    }

    // Check if languages are valid (1-5 languages)
    if (!languages || !Array.isArray(languages) || languages.length === 0 || languages.length > 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please select between 1 and 5 programming languages'
      });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password,
      languages
    });

    // Send token and user data
    createSendToken(newUser, 201, req, res);
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        status: 'fail',
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        status: 'fail',
        message: errors.join('. ')
      });
    }

    // Handle other errors
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Log in a user
exports.login = async (req, res, next) => {
  try {
    console.log('Login request received:', req.body);
    const { username, password } = req.body;

    // Check if username and password exist
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide username and password'
      });
    }

    // Check if user exists & password is correct
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect username or password'
      });
    }
    
    const isPasswordCorrect = await user.correctPassword(password, user.password);
    console.log('Password check result:', isPasswordCorrect);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect username or password'
      });
    }

    // If everything ok, send token to client
    console.log('Login successful for user:', username);
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Log out a user
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({ status: 'success' });
};

// Protect routes - verify user is logged in
exports.protect = async (req, res, next) => {
  try {
    // Get token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password. Please log in again.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token. Please log in again.'
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Your token has expired. Please log in again.'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Check if user is logged in for rendered pages
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // Check if user changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // User is logged in
      return res.status(200).json({
        status: 'success',
        data: {
          user: currentUser
        }
      });
    }
    
    // Not logged in
    res.status(401).json({
      status: 'fail',
      message: 'Not logged in'
    });
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Not logged in'
    });
  }
};

// Password reset functionality
exports.forgotPassword = async (req, res, next) => {
  try {
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'There is no user with that email address.'
      });
    }

    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // In a real app, you'd send an email with the token
    // For demo purposes, just return the token
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
      resetToken // In production, don't send this in the response
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'There was an error sending the email. Try again later!'
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // If token has not expired, and there is user, set the new password
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired'
      });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log the user in, send JWT
    createSendToken(user, 200, req, res);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Change password when logged in
exports.updatePassword = async (req, res, next) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // Check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is wrong'
      });
    }

    // Update password
    user.password = req.body.newPassword;
    await user.save();

    // Log user in, send JWT
    createSendToken(user, 200, req, res);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};