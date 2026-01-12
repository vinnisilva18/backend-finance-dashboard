const Card = require('../models/Card');

// @desc    Get all credit cards
// @route   GET /api/cards
// @access  Private
const getCards = async (req, res) => {
  try {
    const cards = await Card.find({ user: req.user.id }).sort({ name: 1 });
    res.json(cards);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get single credit card
// @route   GET /api/cards/:id
// @access  Private
const getCard = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Credit card not found' });
    }
    
    res.json(card);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Create credit card
// @route   POST /api/cards
// @access  Private
const createCard = async (req, res) => {
  try {
    const {
      name,
      type,
      lastFourDigits,
      limit,
      balance,
      dueDate,
      color,
      notes
    } = req.body;
    
    const card = new Card({
      user: req.user.id,
      name,
      type,
      lastFourDigits,
      limit,
      balance,
      dueDate,
      color,
      notes
    });
    
    await card.save();
    
    res.status(201).json(card);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update credit card
// @route   PUT /api/cards/:id
// @access  Private
const updateCard = async (req, res) => {
  try {
    const {
      name,
      type,
      lastFourDigits,
      limit,
      balance,
      dueDate,
      color,
      notes
    } = req.body;
    
    let card = await Card.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Credit card not found' });
    }
    
    // Update fields
    if (name !== undefined) card.name = name;
    if (type !== undefined) card.type = type;
    if (lastFourDigits !== undefined) card.lastFourDigits = lastFourDigits;
    if (limit !== undefined) card.limit = limit;
    if (balance !== undefined) card.balance = balance;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (color !== undefined) card.color = color;
    if (notes !== undefined) card.notes = notes;
    
    await card.save();
    
    res.json(card);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete credit card
// @route   DELETE /api/cards/:id
// @access  Private
const deleteCard = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Credit card not found' });
    }
    
    await card.deleteOne();
    
    res.json({ message: 'Credit card removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get credit card statistics
// @route   GET /api/cards/stats/summary
// @access  Private
const getCardStats = async (req, res) => {
  try {
    const cards = await Card.find({ user: req.user.id });
    
    const stats = cards.reduce((acc, card) => {
      acc.totalLimit += card.limit;
      acc.totalBalance += card.balance;
      acc.cardCount++;
      return acc;
    }, {
      totalLimit: 0,
      totalBalance: 0,
      availableCredit: 0,
      utilizationRate: 0,
      cardCount: 0
    });
    
    stats.availableCredit = stats.totalLimit - stats.totalBalance;
    stats.utilizationRate = stats.totalLimit > 0 ? stats.totalBalance / stats.totalLimit : 0;
    
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  getCardStats
};