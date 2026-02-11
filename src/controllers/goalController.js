const Goal = require('../models/Goal');
const Currency = require('../models/Currency');
const mongoose = require('mongoose');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function pickCurrencySummary(currencyDoc) {
  if (!currencyDoc || typeof currencyDoc !== 'object') return null;

  const code = currencyDoc.code ? String(currencyDoc.code) : null;
  if (!code) return null;

  return {
    id: currencyDoc._id,
    code,
    symbol: currencyDoc.symbol || null,
    name: currencyDoc.name || null,
    rate: typeof currencyDoc.rate === 'number' ? currencyDoc.rate : Number(currencyDoc.rate || 0) || null,
    isBase: Boolean(currencyDoc.isBase)
  };
}

function serializeGoalWithCalculations(goalDoc) {
  const goal = goalDoc.toObject ? goalDoc.toObject() : goalDoc;
  const daysRemainingRaw = Math.ceil((new Date(goal.deadline) - new Date()) / MS_PER_DAY);
  const daysRemaining = daysRemainingRaw > 0 ? daysRemainingRaw : 0;

  const targetAmount = Number(goal.targetAmount || 0);
  const currentAmount = Number(goal.currentAmount || 0);
  const amountNeeded = Math.max(0, targetAmount - currentAmount);

  const dailyAmountToSave = daysRemaining > 0 ? amountNeeded / daysRemaining : amountNeeded;
  const monthlyAmountToSave = daysRemaining > 0 ? amountNeeded / (daysRemaining / 30) : amountNeeded;

  const currencySummary = pickCurrencySummary(goal.currency);

  return {
    ...goal,
    currencySummary,
    currencyCode: currencySummary?.code || null,
    currencySymbol: currencySummary?.symbol || null,
    daysRemaining,
    amountNeeded,
    dailyAmountToSave,
    monthlyAmountToSave,
    isOverdue: daysRemainingRaw < 0 && !goal.isCompleted
  };
}

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
    
    const goals = await Goal.find(query).populate('category').populate('currency').sort({ priority: 1, deadline: 1 });

    res.json(goals.map(serializeGoalWithCalculations));
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
    }).populate('category').populate('currency');

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    res.json(serializeGoalWithCalculations(goal));
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

    const populatedGoal = await Goal.findOne({
      _id: goal._id,
      user: req.user.id
    }).populate('category').populate('currency');

    res.status(201).json(serializeGoalWithCalculations(populatedGoal || goal));
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

    const populatedGoal = await Goal.findOne({
      _id: goal._id,
      user: req.user.id
    }).populate('category').populate('currency');

    res.json(serializeGoalWithCalculations(populatedGoal || goal));
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
    const contributionAmount = Number(amount);

    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      return res.status(400).json({ message: 'Invalid contribution amount' });
    }
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Add contribution
    goal.currentAmount = Number(goal.currentAmount || 0) + contributionAmount;
    
    // Ensure current amount doesn't exceed target amount
    if (goal.currentAmount > goal.targetAmount) {
      goal.currentAmount = goal.targetAmount;
    }
    
    // Add to contributions history
    goal.contributions = goal.contributions || [];
    goal.contributions.push({
      amount: contributionAmount,
      currency: goal.currency || null,
      date: date || Date.now(),
      notes
    });
    
    await goal.save();

    const populatedGoal = await Goal.findOne({
      _id: goal._id,
      user: req.user.id
    }).populate('category').populate('currency');
    
    res.json({
      goal: serializeGoalWithCalculations(populatedGoal || goal),
      contribution: {
        amount: contributionAmount,
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
    const goals = await Goal.find({ user: req.user.id }).populate('currency');
    const baseCurrencyDoc = await Currency.findOne({ user: req.user.id, isBase: true });

    const baseCurrency = pickCurrencySummary(baseCurrencyDoc?.toObject ? baseCurrencyDoc.toObject() : baseCurrencyDoc);
    const baseRate = typeof baseCurrency?.rate === 'number' && baseCurrency.rate > 0 ? baseCurrency.rate : 1;

    const byCurrency = goals.reduce((acc, goalDoc) => {
      const goal = goalDoc.toObject ? goalDoc.toObject() : goalDoc;
      const currency = pickCurrencySummary(goal.currency);
      const currencyCode = currency?.code || 'UNKNOWN';

      if (!acc[currencyCode]) {
        acc[currencyCode] = {
          currencySummary: currency,
          totalTarget: 0,
          totalCurrent: 0,
          totalProgress: 0,
          goalCount: 0,
          completedCount: 0,
          activeCount: 0
        };
      }

      acc[currencyCode].totalTarget += Number(goal.targetAmount || 0);
      acc[currencyCode].totalCurrent += Number(goal.currentAmount || 0);
      acc[currencyCode].goalCount += 1;

      if (Number(goal.currentAmount || 0) >= Number(goal.targetAmount || 0)) {
        acc[currencyCode].completedCount += 1;
      }

      return acc;
    }, {});

    for (const code of Object.keys(byCurrency)) {
      const entry = byCurrency[code];
      entry.totalProgress = entry.totalTarget > 0 ? entry.totalCurrent / entry.totalTarget : 0;
      entry.activeCount = entry.goalCount - entry.completedCount;
    }

    // Backwards-compatible totals (sum without conversion)
    const totals = goals.reduce(
      (acc, goal) => {
        acc.totalTarget += Number(goal.targetAmount || 0);
        acc.totalCurrent += Number(goal.currentAmount || 0);
        acc.goalCount += 1;
        if (Number(goal.currentAmount || 0) >= Number(goal.targetAmount || 0)) acc.completedCount += 1;
        return acc;
      },
      { totalTarget: 0, totalCurrent: 0, totalProgress: 0, goalCount: 0, completedCount: 0, activeCount: 0 }
    );
    totals.totalProgress = totals.totalTarget > 0 ? totals.totalCurrent / totals.totalTarget : 0;
    totals.activeCount = totals.goalCount - totals.completedCount;

    // Totals converted to base currency (when rates are available)
    const totalsInBase = goals.reduce(
      (acc, goalDoc) => {
        const goal = goalDoc.toObject ? goalDoc.toObject() : goalDoc;
        const currency = pickCurrencySummary(goal.currency);
        const rate = typeof currency?.rate === 'number' && currency.rate > 0 ? currency.rate : null;
        if (!rate) return acc;

        acc.totalTarget += (Number(goal.targetAmount || 0) / rate) * baseRate;
        acc.totalCurrent += (Number(goal.currentAmount || 0) / rate) * baseRate;
        acc.goalCount += 1;
        if (Number(goal.currentAmount || 0) >= Number(goal.targetAmount || 0)) acc.completedCount += 1;
        return acc;
      },
      { totalTarget: 0, totalCurrent: 0, totalProgress: 0, goalCount: 0, completedCount: 0, activeCount: 0 }
    );
    totalsInBase.totalProgress =
      totalsInBase.totalTarget > 0 ? totalsInBase.totalCurrent / totalsInBase.totalTarget : 0;
    totalsInBase.activeCount = totalsInBase.goalCount - totalsInBase.completedCount;

    res.json({
      ...totals,
      baseCurrency,
      totalsInBase,
      byCurrency
    });
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
