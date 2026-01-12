const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const goalController = require('../controllers/goalController');

// @route   GET /api/goals
// @desc    Get all goals
// @access  Private
router.get('/', auth, goalController.getGoals);

// @route   GET /api/goals/:id
// @desc    Get single goal
// @access  Private
router.get('/:id', auth, goalController.getGoal);

// @route   POST /api/goals
// @desc    Create goal
// @access  Private
router.post('/', auth, goalController.createGoal);

// @route   PUT /api/goals/:id
// @desc    Update goal
// @access  Private
router.put('/:id', auth, goalController.updateGoal);

// @route   DELETE /api/goals/:id
// @desc    Delete goal
// @access  Private
router.delete('/:id', auth, goalController.deleteGoal);

// @route   POST /api/goals/:id/contributions
// @desc    Add contribution to goal
// @access  Private
router.post('/:id/contributions', auth, goalController.addContribution);

// @route   GET /api/goals/stats/summary
// @desc    Get goal statistics
// @access  Private
router.get('/stats/summary', auth, goalController.getGoalStats);

module.exports = router;