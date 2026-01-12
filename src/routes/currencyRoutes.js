const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const currencyController = require('../controllers/currencyController');

// @route   GET /api/currencies
// @desc    Get all currencies
// @access  Private
router.get('/', auth, currencyController.getCurrencies);

// @route   POST /api/currencies
// @desc    Add new currency
// @access  Private
router.post('/', auth, currencyController.addCurrency);

// @route   PUT /api/currencies/rates
// @desc    Update currency rates
// @access  Private
router.put('/rates', auth, currencyController.updateRates);

// @route   PUT /api/currencies/base/:code
// @desc    Set base currency
// @access  Private
router.put('/base/:code', auth, currencyController.setBaseCurrency);

// @route   POST /api/currencies/convert
// @desc    Convert currency
// @access  Private
router.post('/convert', auth, currencyController.convertCurrency);

module.exports = router;