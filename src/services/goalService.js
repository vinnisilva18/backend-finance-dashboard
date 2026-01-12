const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const goalService = {
    // Create new goal
    createGoal: async (goalData) => {
        try {
            // Validate deadline
            if (new Date(goalData.deadline) < new Date()) {
                throw new Error('Deadline cannot be in the past');
            }
            
            const goal = new Goal(goalData);
            await goal.save();
            
            // Create notification
            await Notification.create({
                user: goalData.user,
                type: 'goal',
                title: 'New Goal Created 🎯',
                message: `You created a new goal: ${goal.name}`,
                data: { goalId: goal._id, goalName: goal.name },
                priority: 'low'
            });
            
            return goal;
        } catch (error) {
            logger.error('Goal Service - Create error:', error);
            throw error;
        }
    },

    // Get all goals for user
    getUserGoals: async (userId, filters = {}) => {
        try {
            const { status, priority, completed } = filters;
            
            const query = { user: userId };
            
            if (completed !== undefined) {
                query.isCompleted = completed === 'true';
            }
            
            if (status) query.status = status;
            if (priority) query.priority = priority;
            
            const goals = await Goal.find(query)
                .populate('category', 'name color')
                .sort({ priority: -1, deadline: 1 });
            
            // Calculate additional details
            const goalsWithDetails = goals.map(goal => {
                const goalObj = goal.toObject();
                const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                
                return {
                    ...goalObj,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    progress: goal.progress,
                    amountNeeded: goal.amountNeeded,
                    dailyAmountToSave: goal.dailyAmountToSave,
                    isOverdue: daysRemaining < 0 && !goal.isCompleted
                };
            });
            
            return goalsWithDetails;
        } catch (error) {
            logger.error('Goal Service - Get user goals error:', error);
            throw error;
        }
    },

    // Get goal by ID with detailed information
    getGoalById: async (userId, goalId) => {
        try {
            const goal = await Goal.findOne({
                _id: goalId,
                user: userId
            }).populate('category', 'name color icon');
            
            if (!goal) {
                throw new Error('Goal not found');
            }
            
            // Get related transactions if category is set
            let relatedTransactions = [];
            if (goal.category) {
                relatedTransactions = await Transaction.find({
                    user: userId,
                    category: goal.category._id,
                    date: { $gte: goal.createdAt },
                    isDeleted: false
                }).sort({ date: -1 }).limit(20);
            }
            
            // Get contributions (transactions tagged with goal)
            const contributions = await Transaction.find({
                user: userId,
                tags: 'goal-contribution',
                notes: { $regex: goal.name, $options: 'i' },
                isDeleted: false
            }).sort({ date: -1 });
            
            // Calculate progress history
            const progressHistory = await calculateProgressHistory(goalId);
            
            const goalObj = goal.toObject();
            const daysRemaining = goal.daysRemaining;
            
            return {
                ...goalObj,
                daysRemaining,
                dailyAmountToSave: goal.dailyAmountToSave,
                progressHistory,
                relatedTransactions,
                contributions: contributions.map(t => ({
                    amount: t.amount,
                    date: t.date,
                    description: t.description,
                    transactionId: t._id
                })),
                statistics: {
                    totalContributions: contributions.length,
                    totalContributed: contributions.reduce((sum, t) => sum + t.amount, 0),
                    averageContribution: contributions.length > 0 
                        ? contributions.reduce((sum, t) => sum + t.amount, 0) / contributions.length 
                        : 0
                }
            };
        } catch (error) {
            logger.error('Goal Service - Get by ID error:', error);
            throw error;
        }
    },

    // Update goal
    updateGoal: async (userId, goalId, updateData) => {
        try {
            const goal = await Goal.findOneAndUpdate(
                { _id: goalId, user: userId },
                updateData,
                { new: true, runValidators: true }
            ).populate('category', 'name color');
            
            if (!goal) {
                throw new Error('Goal not found');
            }
            
            // Create notification if goal is completed
            if (goal.isCompleted) {
                await Notification.create({
                    user: userId,
                    type: 'goal',
                    title: 'Goal Completed! 🎉',
                    message: `Congratulations! You've completed your goal: ${goal.name}`,
                    data: { goalId: goal._id, goalName: goal.name },
                    priority: 'high'
                });
            }
            
            return goal;
        } catch (error) {
            logger.error('Goal Service - Update error:', error);
            throw error;
        }
    },

    // Delete goal
    deleteGoal: async (userId, goalId) => {
        try {
            const goal = await Goal.findOneAndDelete({
                _id: goalId,
                user: userId
            });
            
            if (!goal) {
                throw new Error('Goal not found');
            }
            
            return true;
        } catch (error) {
            logger.error('Goal Service - Delete error:', error);
            throw error;
        }
    },

    // Add contribution to goal
    addContribution: async (userId, goalId, contributionData) => {
        try {
            const { amount, description, date } = contributionData;
            
            if (!amount || amount <= 0) {
                throw new Error('Valid contribution amount is required');
            }
            
            const goal = await Goal.findOne({
                _id: goalId,
                user: userId
            });
            
            if (!goal) {
                throw new Error('Goal not found');
            }
            
            if (goal.isCompleted) {
                throw new Error('Cannot add contributions to a completed goal');
            }
            
            // Update goal amount
            const oldAmount = goal.currentAmount;
            goal.currentAmount += parseFloat(amount);
            
            // Check if goal is now completed
            const wasCompleted = goal.isCompleted;
            if (goal.currentAmount >= goal.targetAmount && !goal.isCompleted) {
                goal.isCompleted = true;
                goal.completedAt = new Date();
            }
            
            await goal.save();
            
            // Create transaction record for contribution
            const contributionTransaction = await Transaction.create({
                user: userId,
                amount: parseFloat(amount),
                description: description || `Contribution to goal: ${goal.name}`,
                date: date ? new Date(date) : new Date(),
                type: 'expense',
                category: goal.category || null,
                notes: `Goal contribution: ${goal.name}`,
                tags: ['goal-contribution']
            });
            
            // Create notification
            await Notification.create({
                user: userId,
                type: 'goal',
                title: goal.isCompleted && !wasCompleted ? 'Goal Completed! 🎉' : 'Contribution Added 💰',
                message: goal.isCompleted && !wasCompleted 
                    ? `Congratulations! You've completed your goal: ${goal.name}`
                    : `You added $${amount} to your goal: ${goal.name}`,
                data: { 
                    goalId: goal._id, 
                    goalName: goal.name,
                    amount: parseFloat(amount),
                    oldAmount,
                    newAmount: goal.currentAmount,
                    progress: goal.progress
                },
                priority: goal.isCompleted && !wasCompleted ? 'high' : 'low'
            });
            
            return {
                goal,
                contribution: {
                    amount,
                    description,
                    date: date || new Date(),
                    newProgress: goal.progress,
                    transactionId: contributionTransaction._id
                }
            };
        } catch (error) {
            logger.error('Goal Service - Add contribution error:', error);
            throw error;
        }
    },

    // Get goal progress history
    getGoalProgressHistory: async (goalId) => {
        try {
            const goal = await Goal.findById(goalId);
            
            if (!goal) {
                throw new Error('Goal not found');
            }
            
            const progressHistory = await calculateDetailedProgressHistory(goalId);
            
            return {
                goal: {
                    _id: goal._id,
                    name: goal.name,
                    targetAmount: goal.targetAmount,
                    currentAmount: goal.currentAmount,
                    progress: goal.progress
                },
                progressHistory
            };
        } catch (error) {
            logger.error('Goal Service - Progress history error:', error);
            throw error;
        }
    },

    // Get goals summary for dashboard
    getGoalsSummary: async (userId) => {
        try {
            const goals = await Goal.find({ user: userId });
            
            const activeGoals = goals.filter(g => !g.isCompleted);
            const completedGoals = goals.filter(g => g.isCompleted);
            
            // Goals by priority
            const goalsByPriority = {
                high: goals.filter(g => g.priority === 'high').length,
                medium: goals.filter(g => g.priority === 'medium').length,
                low: goals.filter(g => g.priority === 'low').length
            };
            
            // Goals approaching deadline (within 30 days)
            const approachingDeadline = activeGoals.filter(goal => {
                const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                return daysRemaining <= 30 && daysRemaining > 0;
            });
            
            // Goals that need attention
            const needsAttention = activeGoals.filter(goal => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                return progress < 50 && daysRemaining <= 60;
            });
            
            // Calculate financial summary
            const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
            const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0);
            const totalAmountNeeded = totalTargetAmount - totalCurrentAmount;
            
            // Calculate monthly contributions needed
            const monthlyContributionsNeeded = activeGoals.reduce((total, goal) => {
                const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                const amountNeeded = goal.targetAmount - goal.currentAmount;
                
                if (daysRemaining <= 0) {
                    return total + amountNeeded; // Overdue, need immediately
                }
                
                const monthlyNeeded = amountNeeded / (daysRemaining / 30);
                return total + monthlyNeeded;
            }, 0);
            
            return {
                summary: {
                    totalGoals: goals.length,
                    activeGoals: activeGoals.length,
                    completedGoals: completedGoals.length,
                    completionRate: goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0
                },
                priorityBreakdown: goalsByPriority,
                alerts: {
                    approachingDeadline: approachingDeadline.length,
                    needsAttention: needsAttention.length
                },
                financialSummary: {
                    totalTargetAmount,
                    totalCurrentAmount,
                    totalAmountNeeded,
                    monthlyContributionsNeeded: Math.round(monthlyContributionsNeeded),
                    overallProgress: totalTargetAmount > 0 
                        ? (totalCurrentAmount / totalTargetAmount) * 100 
                        : 0
                },
                goalsList: activeGoals.slice(0, 5).map(goal => ({
                    _id: goal._id,
                    name: goal.name,
                    progress: goal.progress,
                    daysRemaining: Math.max(0, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))),
                    priority: goal.priority
                }))
            };
        } catch (error) {
            logger.error('Goal Service - Summary error:', error);
            throw error;
        }
    },

    // Process auto-contributions for goals
    processAutoContributions: async (userId) => {
        try {
            const goals = await Goal.find({
                user: userId,
                'autoContribute.enabled': true,
                isCompleted: false
            });
            
            const results = [];
            const now = new Date();
            
            for (const goal of goals) {
                // Check if it's time for contribution based on frequency
                const lastContribution = await Transaction.findOne({
                    user: userId,
                    notes: { $regex: `Auto-contribution.*${goal.name}`, $options: 'i' }
                }).sort({ date: -1 });
                
                let shouldContribute = false;
                
                if (!lastContribution) {
                    shouldContribute = true; // First contribution
                } else {
                    const daysSinceLast = (now - lastContribution.date) / (1000 * 60 * 60 * 24);
                    
                    switch (goal.autoContribute.frequency) {
                        case 'daily':
                            shouldContribute = daysSinceLast >= 1;
                            break;
                        case 'weekly':
                            shouldContribute = daysSinceLast >= 7;
                            break;
                        case 'monthly':
                            shouldContribute = daysSinceLast >= 30;
                            break;
                    }
                }
                
                if (shouldContribute && goal.autoContribute.amount > 0) {
                    // Add auto-contribution
                    const result = await this.addContribution(userId, goal._id, {
                        amount: goal.autoContribute.amount,
                        description: `Auto-contribution to goal: ${goal.name}`,
                        date: now
                    });
                    
                    results.push({
                        goalId: goal._id,
                        goalName: goal.name,
                        amount: goal.autoContribute.amount,
                        success: true
                    });
                }
            }
            
            return results;
        } catch (error) {
            logger.error('Goal Service - Process auto contributions error:', error);
            throw error;
        }
    },

    // Check for upcoming goal deadlines
    checkUpcomingGoalDeadlines: async (userId) => {
        try {
            const goals = await Goal.find({
                user: userId,
                isCompleted: false
            });
            
            const upcomingDeadlines = goals
                .filter(goal => {
                    const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    return daysRemaining <= 14 && daysRemaining > 0;
                })
                .map(goal => ({
                    goalId: goal._id,
                    goalName: goal.name,
                    deadline: goal.deadline,
                    daysRemaining: Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)),
                    progress: goal.progress,
                    amountNeeded: goal.targetAmount - goal.currentAmount,
                    dailyAmountNeeded: goal.dailyAmountToSave
                }));
            
            // Create notifications for upcoming deadlines
            for (const goal of upcomingDeadlines) {
                if (goal.daysRemaining <= 7) {
                    await Notification.create({
                        user: userId,
                        type: 'reminder',
                        title: 'Goal Deadline Approaching ⏰',
                        message: `Your goal "${goal.goalName}" is due in ${goal.daysRemaining} days`,
                        data: { goalId: goal.goalId, goalName: goal.goalName },
                        priority: goal.daysRemaining <= 3 ? 'high' : 'medium'
                    });
                }
            }
            
            return upcomingDeadlines;
        } catch (error) {
            logger.error('Goal Service - Check deadlines error:', error);
            throw error;
        }
    }
};

// Helper function to calculate detailed progress history
async function calculateDetailedProgressHistory(goalId) {
    const goal = await Goal.findById(goalId);
    const history = [];
    
    // Get all contribution transactions
    const contributions = await Transaction.find({
        notes: { $regex: `goal.*${goal.name}`, $options: 'i' },
        tags: 'goal-contribution'
    }).sort({ date: 1 });
    
    let cumulativeAmount = 0;
    
    // Group contributions by month
    const monthlyContributions = {};
    
    contributions.forEach(contribution => {
        const monthYear = `${contribution.date.getFullYear()}-${contribution.date.getMonth() + 1}`;
        
        if (!monthlyContributions[monthYear]) {
            monthlyContributions[monthYear] = {
                date: new Date(contribution.date.getFullYear(), contribution.date.getMonth(), 1),
                amount: 0,
                count: 0
            };
        }
        
        monthlyContributions[monthYear].amount += contribution.amount;
        monthlyContributions[monthYear].count += 1;
    });
    
    // Convert to array and calculate cumulative progress
    const sortedMonths = Object.values(monthlyContributions).sort((a, b) => a.date - b.date);
    
    sortedMonths.forEach(month => {
        cumulativeAmount += month.amount;
        
        history.push({
            date: month.date,
            amount: cumulativeAmount,
            monthlyAddition: month.amount,
            progress: Math.min(100, (cumulativeAmount / goal.targetAmount) * 100),
            contributionCount: month.count
        });
    });
    
    // Add current state if not already included
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.amount !== goal.currentAmount) {
        history.push({
            date: new Date(),
            amount: goal.currentAmount,
            monthlyAddition: goal.currentAmount - (lastEntry?.amount || 0),
            progress: goal.progress,
            contributionCount: contributions.length
        });
    }
    
    return history;
}

// Helper function to calculate progress history
async function calculateProgressHistory(goalId) {
    // Simplified version - in real app, track progress over time
    const goal = await Goal.findById(goalId);
    const history = [];
    
    const createdDate = new Date(goal.createdAt);
    const now = new Date();
    
    let currentDate = new Date(createdDate);
    let cumulativeAmount = 0;
    
    // Get contributions
    const contributions = await Transaction.find({
        notes: { $regex: goal.name, $options: 'i' },
        tags: 'goal-contribution'
    }).sort({ date: 1 });
    
    // Create monthly progress points
    while (currentDate <= now && cumulativeAmount < goal.targetAmount) {
        const monthContributions = contributions.filter(c => 
            c.date.getMonth() === currentDate.getMonth() &&
            c.date.getFullYear() === currentDate.getFullYear()
        );
        
        const monthlyAmount = monthContributions.reduce((sum, c) => sum + c.amount, 0);
        cumulativeAmount = Math.min(goal.currentAmount, cumulativeAmount + monthlyAmount);
        
        history.push({
            date: new Date(currentDate),
            amount: cumulativeAmount,
            progress: (cumulativeAmount / goal.targetAmount) * 100,
            contributions: monthContributions.length
        });
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return history;
}

module.exports = goalService;