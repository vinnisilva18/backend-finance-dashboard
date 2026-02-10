const Goal = require('../models/Goal');
const mongoose = require('mongoose');

// @desc    Get all goals
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = { user: req.user.id };
    
    if (status === 'active') {
      query.currentAmount = { $lt: '$targetAmount' };
    } else if (status === 'completed') {
      query.currentAmount = { $gte: '$targetAmount' };
    }
    
    const goals = await Goal.find(query).sort({ priority: 1, deadline: 1 });
    
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get single goal
// @route   GET /api/goals/:id
// @access  Private
const getGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Create goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res) => {
  try {
    const {
      name,
      targetAmount,
      currentAmount,
      deadline,
      category,
      currency,
      color,
      priority,
      description
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

          categoryDoc = new Category({
            user: req.user.id,
            name: categoryName,
            type: 'expense', // Default for goals
            color: '#4ECDC4',
            icone: 'flag',
            icon: 'flag'
          });

          await categoryDoc.save();
          console.log(`Categoria criada com sucesso: ${categoryDoc._id}`);
        }

        categoryId = categoryDoc._id;
      }
    }

    const goal = new Goal({
      user: req.user.id,
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      deadline,
      category: categoryId,
      currency,
      color,
      priority,
      description
    });

    await goal.save();

    res.status(201).json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    const {
      name,
      targetAmount,
      currentAmount,
      deadline,
      category,
      currency,
      color,
      priority,
      description
    } = req.body;

    let goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Handle category update separately
    if (category !== undefined) {
      let categoryId = null;
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
      goal.category = categoryId;
    }

    // Update other fields
    if (name !== undefined) goal.name = name;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (currentAmount !== undefined) goal.currentAmount = currentAmount;
    if (deadline !== undefined) goal.deadline = deadline;
    if (currency !== undefined) goal.currency = currency;
    if (color !== undefined) goal.color = color;
    if (priority !== undefined) goal.priority = priority;
    if (description !== undefined) goal.description = description;

    await goal.save();

    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    await goal.deleteOne();
    
    res.json({ message: 'Goal removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Add contribution to goal
// @route   POST /api/goals/:id/contributions
// @access  Private
const addContribution = async (req, res) => {
  try {
    const { amount, date, notes } = req.body;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Add contribution
    goal.currentAmount += amount;
    
    // Ensure current amount doesn't exceed target amount
    if (goal.currentAmount > goal.targetAmount) {
      goal.currentAmount = goal.targetAmount;
    }
    
    // Add to contributions history
    goal.contributions.push({
      amount,
      date: date || Date.now(),
      notes
    });
    
    await goal.save();
    
    res.json({
      goal,
      contribution: {
        amount,
        date: date || Date.now(),
        notes
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get goal statistics
// @route   GET /api/goals/stats/summary
// @access  Private
const getGoalStats = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id });
    
    const stats = goals.reduce((acc, goal) => {
      acc.totalTarget += goal.targetAmount;
      acc.totalCurrent += goal.currentAmount;
      acc.goalCount++;
      
      if (goal.currentAmount >= goal.targetAmount) {
        acc.completedCount++;
      }
      
      return acc;
    }, {
      totalTarget: 0,
      totalCurrent: 0,
      totalProgress: 0,
      goalCount: 0,
      completedCount: 0,
      activeCount: 0
    });
    
    stats.totalProgress = stats.totalTarget > 0 ? stats.totalCurrent / stats.totalTarget : 0;
    stats.activeCount = stats.goalCount - stats.completedCount;
    
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  addContribution,
  getGoalStats
};