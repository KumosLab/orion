const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All user routes are protected
router.use(protect);

// Get current user data
router.get('/me', userController.getMe);

// Update user languages
router.patch('/update-languages', userController.updateLanguages);

// Update user profile
router.patch('/update-profile', userController.updateProfile);

// Delete user account
router.delete('/delete-account', userController.deleteAccount);

module.exports = router;