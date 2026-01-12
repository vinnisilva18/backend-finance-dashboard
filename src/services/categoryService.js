const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const categoryService = {
    // Create new category
    createCategory: async (categoryData) => {
        try {
            // Check for duplicate category name and type
            const existingCategory = await Category.findOne({
                user: categoryData.user,
                name: categoryData.name,
                type: categoryData.type
            });
            
            if (existingCategory) {
                throw new Error('Category with this name and type already exists');
            }
            
            const category = new Category(categoryData);
            await category.save();
            
            return category;
        } catch (error) {
            logger.error('Category Service - Create error:', error);
            throw error;
        }
    },

    // Get all categories for user
    getUserCategories: async (userId, filters = {}) => {
        try {
            const { type, activeOnly = true } = filters;
            
            const query = { user: userId };
            if (type) query.type = type;
            if (activeOnly) query.isActive = true;
            
            const categories = await Category.find(query)
                .sort({ order: 1, name: 1 });
            
            // Get statistics for each category
            const categoriesWithStats = await Promise.all(
                categories.map(async (category) => {
                    const transactions = await Transaction.find({
                        category: category._id,
                        isDeleted: false
                    });
                    
                    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
                    const transactionCount = transactions.length;
                    const monthlySpent = await calculateMonthlySpending(category._id);
                    
                    return {
                        ...category.toObject(),
                        totalAmount,
                        transactionCount,
                        monthlySpent,
                        budgetUtilization: category.monthlyBudget > 0 
                            ? (monthlySpent / category.monthlyBudget) * 100 
                            : 0,
                        averageTransaction: transactionCount > 0 
                            ? totalAmount / transactionCount 
                            : 0
                    };
                })
            );
            
            return categoriesWithStats;
        } catch (error) {
            logger.error('Category Service - Get user categories error:', error);
            throw error;
        }
    },

    // Get category by ID with detailed statistics
    getCategoryById: async (userId, categoryId) => {
        try {
            const category = await Category.findOne({
                _id: categoryId,
                user: userId
            });
            
            if (!category) {
                throw new Error('Category not found');
            }
            
            // Get recent transactions
            const recentTransactions = await Transaction.find({
                category: category._id,
                isDeleted: false
            }).sort({ date: -1 }).limit(50);
            
            // Calculate statistics
            const totalTransactions = await Transaction.countDocuments({
                category: category._id,
                isDeleted: false
            });
            
            const totalAmount = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
            const monthlySpent = await calculateMonthlySpending(category._id);
            const yearlySpent = await calculateYearlySpending(category._id);
            
            // Get monthly spending trend
            const monthlyTrend = await calculateMonthlyTrend(category._id);
            
            return {
                ...category.toObject(),
                statistics: {
                    totalTransactions,
                    totalAmount,
                    monthlySpent,
                    yearlySpent,
                    budgetUtilization: category.monthlyBudget > 0 
                        ? (monthlySpent / category.monthlyBudget) * 100 
                        : 0,
                    averageTransaction: totalTransactions > 0 
                        ? totalAmount / totalTransactions 
                        : 0
                },
                recentTransactions,
                monthlyTrend
            };
        } catch (error) {
            logger.error('Category Service - Get by ID error:', error);
            throw error;
        }
    },

    // Update category
    updateCategory: async (userId, categoryId, updateData) => {
        try {
            // Check for duplicate name if name is being updated
            if (updateData.name) {
                const existingCategory = await Category.findOne({
                    user: userId,
                    name: updateData.name,
                    type: updateData.type || undefined,
                    _id: { $ne: categoryId }
                });
                
                if (existingCategory) {
                    throw new Error('Another category with this name and type already exists');
                }
            }
            
            const category = await Category.findOneAndUpdate(
                { _id: categoryId, user: userId },
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!category) {
                throw new Error('Category not found');
            }
            
            // Check budget alerts
            if (updateData.monthlyBudget !== undefined || updateData.monthlyBudget === 0) {
                await checkBudgetAlerts(userId, category);
            }
            
            return category;
        } catch (error) {
            logger.error('Category Service - Update error:', error);
            throw error;
        }
    },

    // Delete category
    deleteCategory: async (userId, categoryId) => {
        try {
            // Check if category has transactions
            const transactionCount = await Transaction.countDocuments({
                category: categoryId,
                isDeleted: false
            });
            
            if (transactionCount > 0) {
                throw new Error('Cannot delete category with existing transactions');
            }
            
            const category = await Category.findOneAndDelete({
                _id: categoryId,
                user: userId
            });
            
            if (!category) {
                throw new Error('Category not found');
            }
            
            return true;
        } catch (error) {
            logger.error('Category Service - Delete error:', error);
            throw error;
        }
    },

    // Update category order
    updateCategoryOrder: async (userId, categories) => {
        try {
            if (!Array.isArray(categories)) {
                throw new Error('Categories array is required');
            }
            
            // Update order for each category
            const updatePromises = categories.map((cat, index) => 
                Category.findOneAndUpdate(
                    { _id: cat._id, user: userId },
                    { order: index },
                    { new: true }
                )
            );
            
            await Promise.all(updatePromises);
            
            return true;
        } catch (error) {
            logger.error('Category Service - Update order error:', error);
            throw error;
        }
    },

    // Get category statistics
    getCategoryStatistics: async (userId, period = 'month') => {
        try {
            const now = new Date();
            let startDate, endDate;
            
            if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (period === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            }
            
            // Get all expense categories
            const categories = await Category.find({
                user: userId,
                type: 'expense',
                isActive: true
            });
            
            // Get transactions for period
            const transactions = await Transaction.find({
                user: userId,
                date: { $gte: startDate, $lte: endDate },
                type: 'expense',
                isDeleted: false
            }).populate('category', 'name color');
            
            // Calculate category spending
            const categorySpending = categories.map(category => {
                const categoryTransactions = transactions.filter(
                    t => t.category && t.category._id.toString() === category._id.toString()
                );
                
                const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
                const transactionCount = categoryTransactions.length;
                
                return {
                    category: {
                        _id: category._id,
                        name: category.name,
                        color: category.color,
                        monthlyBudget: category.monthlyBudget
                    },
                    totalSpent,
                    transactionCount,
                    budgetUtilization: category.monthlyBudget > 0 
                        ? (totalSpent / category.monthlyBudget) * 100 
                        : 0,
                    averageTransaction: transactionCount > 0 
                        ? totalSpent / transactionCount 
                        : 0
                };
            });
            
            // Sort by total spent
            categorySpending.sort((a, b) => b.totalSpent - a.totalSpent);
            
            // Calculate totals
            const totalSpent = categorySpending.reduce((sum, cat) => sum + cat.totalSpent, 0);
            const totalBudget = categories.reduce((sum, cat) => sum + cat.monthlyBudget, 0);
            
            return {
                categorySpending,
                summary: {
                    totalSpent,
                    totalBudget,
                    overallUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
                    period: {
                        start: startDate,
                        end: endDate,
                        type: period
                    }
                }
            };
        } catch (error) {
            logger.error('Category Service - Statistics error:', error);
            throw error;
        }
    },

    // Get budget alerts
    getBudgetAlerts: async (userId) => {
        try {
            const categories = await Category.find({
                user: userId,
                type: 'expense',
                monthlyBudget: { $gt: 0 },
                isActive: true
            });
            
            const alerts = [];
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            
            for (const category of categories) {
                const transactions = await Transaction.find({
                    user: userId,
                    category: category._id,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                    type: 'expense',
                    isDeleted: false
                });
                
                const monthlySpent = transactions.reduce((sum, t) => sum + t.amount, 0);
                const percentage = (monthlySpent / category.monthlyBudget) * 100;
                
                if (percentage >= 100) {
                    alerts.push({
                        categoryId: category._id,
                        categoryName: category.name,
                        type: 'exceeded',
                        message: `Budget exceeded by ${Math.round(percentage - 100)}%`,
                        spent: monthlySpent,
                        budget: category.monthlyBudget,
                        percentage: percentage,
                        priority: 'urgent'
                    });
                } else if (percentage >= 90) {
                    alerts.push({
                        categoryId: category._id,
                        categoryName: category.name,
                        type: 'warning',
                        message: `Budget almost exceeded (${Math.round(percentage)}%)`,
                        spent: monthlySpent,
                        budget: category.monthlyBudget,
                        percentage: percentage,
                        priority: 'high'
                    });
                } else if (percentage >= 75) {
                    alerts.push({
                        categoryId: category._id,
                        categoryName: category.name,
                        type: 'alert',
                        message: `Budget at ${Math.round(percentage)}%`,
                        spent: monthlySpent,
                        budget: category.monthlyBudget,
                        percentage: percentage,
                        priority: 'medium'
                    });
                }
            }
            
            return alerts;
        } catch (error) {
            logger.error('Category Service - Budget alerts error:', error);
            throw error;
        }
    }
};

// Helper function to calculate monthly spending
async function calculateMonthlySpending(categoryId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const transactions = await Transaction.find({
        category: categoryId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: false,
        type: 'expense'
    });
    
    return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// Helper function to calculate yearly spending
async function calculateYearlySpending(categoryId) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    
    const transactions = await Transaction.find({
        category: categoryId,
        date: { $gte: startOfYear, $lte: endOfYear },
        isDeleted: false
    });
    
    return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// Helper function to calculate monthly trend
async function calculateMonthlyTrend(categoryId) {
    const trend = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        
        const transactions = await Transaction.find({
            category: categoryId,
            date: { $gte: monthStart, $lte: monthEnd },
            isDeleted: false
        });
        
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        
        trend.push({
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear(),
            total: total,
            count: transactions.length
        });
    }
    
    return trend;
}

// Helper function to check budget alerts
async function checkBudgetAlerts(userId, category) {
    const monthlySpent = await calculateMonthlySpending(category._id);
    const percentage = (monthlySpent / category.monthlyBudget) * 100;
    
    if (percentage >= 90) {
        await Notification.create({
            user: userId,
            type: 'budget',
            title: percentage >= 100 ? 'Budget Exceeded! ⚠️' : 'Budget Warning',
            message: percentage >= 100 
                ? `You've exceeded your ${category.name} budget by ${Math.round(percentage - 100)}%`
                : `You've used ${Math.round(percentage)}% of your ${category.name} budget`,
            data: { 
                categoryId: category._id, 
                categoryName: category.name,
                spent: monthlySpent,
                budget: category.monthlyBudget,
                percentage: percentage
            },
            priority: percentage >= 100 ? 'urgent' : 'high'
        });
    }
}

module.exports = categoryService;