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

    // Find or create category by name if provided
    let categoryId = null;
    
    // Only process category if it's provided and valid
    if (category && typeof category === 'string' && category !== 'undefined' && category.trim() !== '') {
      const Category = require('../models/Category');
      const categoryName = category.trim();
      let categoryDoc = await Category.findOne({
        name: { $regex: `^${categoryName}$`, $options: 'i' },
        user: req.user.id
      });

      // Se a categoria não existe, criar automaticamente
      if (!categoryDoc) {
        console.log(`Criando categoria automaticamente: ${categoryName}`);
        
        // Definir cores padrão baseadas no tipo
        const defaultColors = {
          income: '#4CAF50',  // Verde para receitas
          expense: '#F44336'  // Vermelho para despesas
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

    // If category is provided, find it by name
    let categoryId = transaction.category;
    if (category && typeof category === 'string' && category !== 'undefined' && category.trim() !== '') {
      const Category = require('../models/Category');
      const categoryName = category.trim();
      const categoryDoc = await Category.findOne({
        name: { $regex: `^${categoryName}$`, $options: 'i' },
        user: req.user.id
      });

      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: `Category "${categoryName}" not found. Please create the category first.`
        });
      }
      categoryId = categoryDoc._id;
    } else if (category === 'undefined' || category === '' || !category) {
      categoryId = null;
    }

    // Update fields
    if (amount !== undefined) transaction.amount = amount;
    if (description !== undefined) transaction.description = description;
    if (type !== undefined) transaction.type = type;
    if (category !== undefined) transaction.category = categoryId;
    if (date !== undefined) transaction.date = date;
    if (card !== undefined) transaction.card = card;
    if (notes !== undefined) transaction.notes = notes;

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