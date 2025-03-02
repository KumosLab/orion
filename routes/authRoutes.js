const express = require('express');
const gameController = require('../controllers/gameController.js');
const authController = require('../controllers/authController.js');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/check', authController.isLoggedIn);

// Password reset routes
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes
router.use(protect);

// Get daily challenge
router.get('/challenge', gameController.getDailyChallenge);

// Check daily challenge status
router.get('/daily-status', gameController.getDailyStatus);

// Submit answer
router.post('/submit', gameController.submitAnswer);

// Get leaderboard
router.get('/leaderboard', gameController.getLeaderboard);

// Get user stats
router.get('/user-stats', gameController.getUserStats);

// Protected route for updating password
router.patch('/updatePassword', authController.updatePassword);

module.exports = router;