const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    
    let query = { user: req.user.id };
    
    // Date filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Category filter
    if (category) {
      const Category = require('../models/Category');
      const categoryDoc = await Category.findOne({
        name: { $regex: `^${category}$`, $options: 'i' },
        user: req.user.id
      });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        // If category not found, return empty array
        return res.json([]);
      }
    }
    
    // Type filter
    if (type) {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .populate('category', 'name color')
      .populate('card', 'name type');
    
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('category', 'name color')
      .populate('card', 'name type');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const {
      amount,
      description,
      type,
      category,
      date,
      card,
      notes
    } = req.body;

    let categoryId = null;
    
    if (category && typeof category === 'string' && category !== 'undefined' && category.trim() !== '') {
      const categoryValue = category.trim();
      const Category = require('../models/Category');

      if (mongoose.Types.ObjectId.isValid(categoryValue)) {
        // The value is a valid ObjectId format. Treat it as an ID.
        const categoryDoc = await Category.findOne({ _id: categoryValue, user: req.user.id });
        if (categoryDoc) {
          categoryId = categoryDoc._id;
        } else {
          // It's a valid format, but no such category exists for this user.
          return res.status(400).json({ message: `A categoria com o ID "${categoryValue}" não foi encontrada.` });
        }
      } else {
        // The value is NOT an ObjectId. Treat it as a name.
        const categoryName = categoryValue;
        let categoryDoc = await Category.findOne({
          name: { $regex: `^${categoryName}$`, $options: 'i' },
          user: req.user.id
        });

        // If the category doesn't exist by name, create it.
        if (!categoryDoc) {
          console.log(`Criando categoria automaticamente: ${categoryName}`);
          
          const defaultColors = {
            income: '#4CAF50',
            expense: '#F44336'
          };
          
          categoryDoc = new Category({
            user: req.user.id,
            name: categoryName,
            type: type,
            color: defaultColors[type] || '#4CAF50',
            icone: 'category',
            icon: 'category'
          });
          
          await categoryDoc.save();
          console.log(`Categoria criada com sucesso: ${categoryDoc._id}`);
        }
        
        categoryId = categoryDoc._id;
      }
    }

    const transaction = new Transaction({
      user: req.user.id,
      amount,
      description,
      type,
      category: categoryId, // Use the ObjectId or null
      date: date || Date.now(),
      card,
      notes
    });

    await transaction.save();

    // Populate references
    await transaction.populate('category', 'name color icone');
    await transaction.populate('card', 'name type');

    res.status(201).json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const {
      amount,
      description,
      type,
      category,
      date,
      card,
      notes
    } = req.body;

    let transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Update fields
    if (amount !== undefined) transaction.amount = amount;
    if (description !== undefined) transaction.description = description;
    if (type !== undefined) transaction.type = type;
    if (date !== undefined) transaction.date = date;
    if (card !== undefined) transaction.card = card;
    if (notes !== undefined) transaction.notes = notes;

    // Handle category update separately to avoid ambiguity between ID and name
    if (category !== undefined) {
      let categoryId = null; // Default to null if category is empty/invalid
      if (category && typeof category === 'string' && category.trim() !== '') {
        const categoryValue = category.trim();
        const Category = require('../models/Category');

        if (mongoose.Types.ObjectId.isValid(categoryValue)) {
          // It's an ID
          const categoryDoc = await Category.findOne({ _id: categoryValue, user: req.user.id });
          if (!categoryDoc) {
            return res.status(400).json({ message: `A categoria com o ID "${categoryValue}" não foi encontrada.` });
          }
          categoryId = categoryDoc._id;
        } else {
          // It's a name
          const categoryDoc = await Category.findOne({ name: { $regex: `^${categoryValue}$`, $options: 'i' }, user: req.user.id });
          if (!categoryDoc) {
            return res.status(400).json({ message: `A categoria com o nome "${categoryValue}" não foi encontrada.` });
          }
          categoryId = categoryDoc._id;
        }
      }
      transaction.category = categoryId; // Set to the new ID or null
    }

    await transaction.save();

    // Populate references
    await transaction.populate('category', 'name color');
    await transaction.populate('card', 'name type');

    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    await transaction.deleteOne();
    
    res.json({ message: 'Transaction removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats/summary
// @access  Private
const getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchQuery = { user: new mongoose.Types.ObjectId(req.user.id) };
    
    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const stats = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0]
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpenses: 1,
          netSavings: { $subtract: ['$totalIncome', '$totalExpenses'] },
          count: 1
        }
      }
    ]);
    
    res.json(stats[0] || {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      count: 0
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
};