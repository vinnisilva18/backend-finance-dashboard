const axios = require('axios');
const Currency = require('../models/Currency');

// @desc    Get all currencies
// @route   GET /api/currencies
// @access  Private
const getCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find({ user: req.user.id });
    
    // If user has no currencies, create default ones
    if (currencies.length === 0) {
      const defaultCurrencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, isBase: true, user: req.user.id },
        { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.85, isBase: false, user: req.user.id },
        { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.73, isBase: false, user: req.user.id },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 110.5, isBase: false, user: req.user.id },
      ];
      
      await Currency.insertMany(defaultCurrencies);
      const updatedCurrencies = await Currency.find({ user: req.user.id });
      return res.json(updatedCurrencies);
    }
    
    res.json(currencies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update currency rates
// @route   PUT /api/currencies/rates
// @access  Private
const updateRates = async (req, res) => {
  try {
    // In a real app, you would fetch from an API like ExchangeRate-API
    // For now, we'll simulate with random updates
    
    const currencies = await Currency.find({ user: req.user.id });
    
    const updatedCurrencies = await Promise.all(
      currencies.map(async (currency) => {
        if (currency.isBase) {
          currency.rate = 1;
        } else {
          // Simulate rate changes (between -2% and +2%)
          const changePercent = (Math.random() * 4 - 2) / 100;
          currency.rate = currency.rate * (1 + changePercent);
        }
        return currency.save();
      })
    );
    
    res.json({
      message: 'Exchange rates updated',
      currencies: updatedCurrencies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Set base currency
// @route   PUT /api/currencies/base/:code
// @access  Private
const setBaseCurrency = async (req, res) => {
  try {
    const { code } = req.params;
    
    // Find the currency to set as base
    const newBaseCurrency = await Currency.findOne({
      code,
      user: req.user.id
    });
    
    if (!newBaseCurrency) {
      return res.status(404).json({ message: 'Currency not found' });
    }
    
    // Get current base currency
    const currentBaseCurrency = await Currency.findOne({
      isBase: true,
      user: req.user.id
    });
    
    if (currentBaseCurrency) {
      // Unset current base
      currentBaseCurrency.isBase = false;
      await currentBaseCurrency.save();
    }
    
    // Set new base
    newBaseCurrency.isBase = true;
    newBaseCurrency.rate = 1;
    await newBaseCurrency.save();
    
    // Update all other rates relative to new base
    const otherCurrencies = await Currency.find({
      user: req.user.id,
      _id: { $ne: newBaseCurrency._id }
    });
    
    const updatedCurrencies = await Promise.all(
      otherCurrencies.map(async (currency) => {
        // Convert from old base to new base
        if (currentBaseCurrency) {
          // In real app, you would use actual exchange rate logic
          currency.rate = 1 / newBaseCurrency.rate * currency.rate;
        }
        return currency.save();
      })
    );
    
    const allCurrencies = await Currency.find({ user: req.user.id });
    
    res.json({
      message: `Base currency set to ${code}`,
      currencies: allCurrencies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Convert currency
// @route   POST /api/currencies/convert
// @access  Private
const convertCurrency = async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;
    
    // Get both currencies
    const from = await Currency.findOne({
      code: fromCurrency,
      user: req.user.id
    });
    
    const to = await Currency.findOne({
      code: toCurrency,
      user: req.user.id
    });
    
    if (!from || !to) {
      return res.status(404).json({ message: 'Currency not found' });
    }
    
    // Convert amount
    const convertedAmount = (amount / from.rate) * to.rate;
    
    res.json({
      original: {
        amount,
        currency: fromCurrency
      },
      converted: {
        amount: convertedAmount,
        currency: toCurrency
      },
      rate: to.rate / from.rate
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Add new currency
// @route   POST /api/currencies
// @access  Private
const addCurrency = async (req, res) => {
  try {
    const { code, name, symbol, rate } = req.body;
    
    // Check if currency already exists
    const existingCurrency = await Currency.findOne({
      code,
      user: req.user.id
    });
    
    if (existingCurrency) {
      return res.status(400).json({ message: 'Currency already exists' });
    }
    
    const currency = new Currency({
      user: req.user.id,
      code,
      name,
      symbol,
      rate: rate || 1,
      isBase: false
    });
    
    await currency.save();
    
    res.status(201).json(currency);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getCurrencies,
  updateRates,
  setBaseCurrency,
  convertCurrency,
  addCurrency
};