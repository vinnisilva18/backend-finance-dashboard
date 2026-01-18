const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Goal = require('../models/Goal');
const Card = require('../models/Card');
const mongoose = require('mongoose');

// @desc    Get user preferences
// @route   GET /api/user/preferences
// @access  Private
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    res.json(user.preferences);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update user preferences
// @route   PUT /api/user/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update preferences
    user.preferences = { ...user.preferences, ...preferences };
    
    await user.save();
    
    res.json({
      message: 'Preferences updated',
      preferences: user.preferences
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get user statistics
// @route   GET /api/user/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    // Get total transactions count
    const totalTransactions = await Transaction.countDocuments({ user: userId });
    
    // Calculate income, expenses and savings
    const transactionStats = await Transaction.aggregate([
      { $match: { user: userId } },
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
          }
        }
      }
    ]);
    
    const totalIncome = transactionStats[0]?.totalIncome || 0;
    const totalExpenses = transactionStats[0]?.totalExpenses || 0;
    const totalSavings = totalIncome - totalExpenses;
    
    // Calculate monthly averages (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyStats = await Transaction.aggregate([
      { 
        $match: { 
          user: userId,
          date: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: null,
          monthlyIncome: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          monthlyExpenses: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0]
            }
          }
        }
      }
    ]);
    
    const monthlyIncome = monthlyStats[0]?.monthlyIncome || 0;
    const monthlyExpenses = monthlyStats[0]?.monthlyExpenses || 0;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    
    // Get total categories
    const totalCategories = await Category.countDocuments({ user: userId });
    
    // Get active goals (not completed)
    const activeGoals = await Goal.countDocuments({ 
      user: userId,
      isCompleted: false
    });
    
    // Get total goals for achievement rate
    const totalGoals = await Goal.countDocuments({ user: userId });
    const completedGoals = await Goal.countDocuments({ 
      user: userId,
      isCompleted: true
    });
    
    // Calculate achievement rate
    const achievementRate = totalGoals > 0 
      ? Math.round((completedGoals / totalGoals) * 100) 
      : 0;
    
    // Get credit cards count
    const creditCards = await Card.countDocuments({ user: userId });
    
    const stats = {
      totalTransactions,
      totalCategories,
      activeGoals,
      creditCards,
      totalSavings: Math.round(totalSavings * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      monthlyAverage: {
        income: Math.round(monthlyIncome * 100) / 100,
        expenses: Math.round(monthlyExpenses * 100) / 100,
        savings: Math.round(monthlySavings * 100) / 100
      },
      achievementRate,
      completedGoals,
      totalGoals
    };
    
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Change password
// @route   PUT /api/user/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check current password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }
    
    // In a real app, you would also delete all user-related data
    // (transactions, categories, goals, etc.)
    
    await user.deleteOne();
    
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  getUserStats,
  changePassword,
  deleteAccount
};