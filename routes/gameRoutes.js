const express = require('express');
const gameController = require('../controllers/gameController.js');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All game routes are protected
router.use(protect);

// Get daily challenge
router.get('/challenge', gameController.getDailyChallenge);

// Submit answer
router.post('/submit', gameController.submitAnswer);

// Get leaderboard
router.get('/leaderboard', gameController.getLeaderboard);

// Get user stats
router.get('/user-stats', gameController.getUserStats);

// Check daily status
router.get('/daily-status', gameController.getDailyStatus);

// Admin route: Reset player's last play time
router.post('/admin/reset-player/:playerId', gameController.resetPlayerLastPlay);

module.exports = router;