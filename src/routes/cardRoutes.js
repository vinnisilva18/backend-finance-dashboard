const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const cardController = require('../controllers/cardController');

// @route   GET /api/cards
// @desc    Get all credit cards
// @access  Private
router.get('/', auth, cardController.getCards);

// @route   GET /api/cards/:id
// @desc    Get single credit card
// @access  Private
router.get('/:id', auth, cardController.getCard);

// @route   POST /api/cards
// @desc    Create credit card
// @access  Private
router.post('/', auth, cardController.createCard);

// @route   PUT /api/cards/:id
// @desc    Update credit card
// @access  Private
router.put('/:id', auth, cardController.updateCard);

// @route   DELETE /api/cards/:id
// @desc    Delete credit card
// @access  Private
router.delete('/:id', auth, cardController.deleteCard);

// @route   GET /api/cards/stats/summary
// @desc    Get credit card statistics
// @access  Private
router.get('/stats/summary', auth, cardController.getCardStats);

module.exports = router;