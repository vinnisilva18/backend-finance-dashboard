const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', auth, transactionController.getTransactions);

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', auth, transactionController.getTransaction);

// @route   POST /api/transactions
// @desc    Create transaction
// @access  Private
router.post('/', auth, transactionController.createTransaction);

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', auth, transactionController.updateTransaction);

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', auth, transactionController.deleteTransaction);

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction statistics
// @access  Private
router.get('/stats/summary', auth, transactionController.getTransactionStats);

module.exports = router;