const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

// @route   GET /api/user/preferences
// @desc    Get user preferences
// @access  Private
router.get('/preferences', auth, userController.getPreferences);

// @route   PUT /api/user/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', auth, userController.updatePreferences);

// @route   GET /api/user/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, userController.getUserStats);

// @route   PUT /api/user/password
// @desc    Change password
// @access  Private
router.put('/password', auth, userController.changePassword);

// @route   DELETE /api/user/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, userController.deleteAccount);

module.exports = router;