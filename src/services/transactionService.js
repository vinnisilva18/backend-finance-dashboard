const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const CreditCard = require('../models/CreditCard');
const logger = require('../utils/logger');

const transactionService = {
    createTransaction: async (transactionData) => {
        try {
            // Validate credit card if provided
            if (transactionData.creditCard) {
                const card = await CreditCard.findOne({
                    _id: transactionData.creditCard,
                    user: transactionData.user
                });

                if (!card) {
                    throw new Error('Credit card not found');
                }

                // Update card balance if it's an expense
                if (transactionData.type === 'expense') {
                    card.currentBalance += transactionData.amount;
                    card.lastUsed = new Date();
                    await card.save();
                }
            }

            // Validate category
            const category = await Category.findOne({
                _id: transactionData.category,
                user: transactionData.user
            });

            if (!category) {
                throw new Error('Category not found');
            }

            // Create transaction
            const transaction = new Transaction(transactionData);
            await transaction.save();

            // Populate related data
            await transaction.populate([
                { path: 'category', select: 'name color icon type' },
                { path: 'creditCard', select: 'cardName lastFourDigits' }
            ]);

            return transaction;

        } catch (error) {
            logger.error('Transaction Service - Create error:', error);
            throw error;
        }
    },

    getTransactions: async (userId, filters = {}) => {
        try {
            const {
                page = 1,
                limit = 50,
                type,
                category,
                startDate,
                endDate,
                paymentMethod,
                minAmount,
                maxAmount,
                search,
                sortBy = 'date',
                sortOrder = 'desc'
            } = filters;

            // Build query
            const query = { user: userId, isDeleted: false };

            if (type) query.type = type;
            if (category) query.category = category;
            if (paymentMethod) query.paymentMethod = paymentMethod;

            // Date range filter
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            // Amount range filter
            if (minAmount || maxAmount) {
                query.amount = {};
                if (minAmount) query.amount.$gte = parseFloat(minAmount);
                if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
            }

            // Search filter
            if (search) {
                query.$or = [
                    { description: { $regex: search, $options: 'i' } },
                    { notes: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Get total count
            const total = await Transaction.countDocuments(query);

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute query
            const transactions = await Transaction.find(query)
                .populate('category', 'name color icon type')
                .populate('creditCard', 'cardName lastFourDigits')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));

            // Calculate summary
            const totalIncome = await Transaction.aggregate([
                { $match: { ...query, type: 'income' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const totalExpense = await Transaction.aggregate([
                { $match: { ...query, type: 'expense' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                summary: {
                    totalIncome: totalIncome[0]?.total || 0,
                    totalExpense: totalExpense[0]?.total || 0,
                    netBalance: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
                    totalTransactions: total
                }
            };

        } catch (error) {
            logger.error('Transaction Service - Get transactions error:', error);
            throw error;
        }
    },

    getTransactionById: async (userId, transactionId) => {
        try {
            const transaction = await Transaction.findOne({
                _id: transactionId,
                user: userId,
                isDeleted: false
            }).populate('category', 'name color icon type')
              .populate('creditCard', 'cardName lastFourDigits cardType');

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            return transaction;
        } catch (error) {
            logger.error('Transaction Service - Get by ID error:', error);
            throw error;
        }
    },

    updateTransaction: async (userId, transactionId, updateData) => {
        try {
            const transaction = await Transaction.findOneAndUpdate(
                { _id: transactionId, user: userId, isDeleted: false },
                updateData,
                { new: true, runValidators: true }
            ).populate('category', 'name color icon type');

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            return transaction;
        } catch (error) {
            logger.error('Transaction Service - Update error:', error);
            throw error;
        }
    },

    deleteTransaction: async (userId, transactionId) => {
        try {
            const transaction = await Transaction.findOneAndUpdate(
                { _id: transactionId, user: userId, isDeleted: false },
                { isDeleted: true },
                { new: true }
            );

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            return true;
        } catch (error) {
            logger.error('Transaction Service - Delete error:', error);
            throw error;
        }
    },

    getStatistics: async (userId, period = 'month', year, month) => {
        try {
            const now = new Date();
            const currentYear = year || now.getFullYear();
            const currentMonth = month || now.getMonth() + 1;

            let startDate, endDate;

            if (period === 'month') {
                startDate = new Date(currentYear, currentMonth - 1, 1);
                endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
            } else if (period === 'year') {
                startDate = new Date(currentYear, 0, 1);
                endDate = new Date(currentYear, 11, 31, 23, 59, 59);
            } else if (period === 'week') {
                const today = new Date();
                const dayOfWeek = today.getDay();
                startDate = new Date(today.setDate(today.getDate() - dayOfWeek));
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
            }

            // Get transactions for period
            const transactions = await Transaction.find({
                user: userId,
                date: { $gte: startDate, $lte: endDate },
                isDeleted: false
            }).populate('category', 'name color type');

            // Calculate statistics
            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const totalExpense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            // Category-wise spending
            const categorySpending = {};
            transactions
                .filter(t => t.type === 'expense')
                .forEach(t => {
                    const categoryName = t.category?.name || 'Uncategorized';
                    if (!categorySpending[categoryName]) {
                        categorySpending[categoryName] = {
                            amount: 0,
                            color: t.category?.color || '#CCCCCC',
                            count: 0
                        };
                    }
                    categorySpending[categoryName].amount += t.amount;
                    categorySpending[categoryName].count += 1;
                });

            // Monthly trend (last 6 months)
            const monthlyTrend = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

                const monthTransactions = await Transaction.find({
                    user: userId,
                    date: { $gte: monthStart, $lte: monthEnd },
                    isDeleted: false
                });

                const monthIncome = monthTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);

                const monthExpense = monthTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);

                monthlyTrend.push({
                    month: date.toLocaleString('default', { month: 'short' }),
                    year: date.getFullYear(),
                    income: monthIncome,
                    expense: monthExpense,
                    balance: monthIncome - monthExpense
                });
            }

            // Top expenses
            const topExpenses = transactions
                .filter(t => t.type === 'expense')
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10)
                .map(t => ({
                    description: t.description,
                    amount: t.amount,
                    date: t.date,
                    category: t.category?.name,
                    color: t.category?.color
                }));

            return {
                summary: {
                    totalIncome,
                    totalExpense,
                    netBalance: totalIncome - totalExpense,
                    transactionCount: transactions.length
                },
                categorySpending,
                monthlyTrend,
                topExpenses,
                period: {
                    start: startDate,
                    end: endDate,
                    type: period
                }
            };

        } catch (error) {
            logger.error('Transaction Service - Statistics error:', error);
            throw error;
        }
    },

    importTransactions: async (userId, transactions) => {
        try {
            if (!Array.isArray(transactions) || transactions.length === 0) {
                throw new Error('No transactions provided');
            }

            // Validate and prepare transactions
            const validTransactions = transactions
                .filter(t => t.amount && t.description && t.date)
                .map(t => ({
                    ...t,
                    user: userId,
                    date: new Date(t.date)
                }));

            if (validTransactions.length === 0) {
                throw new Error('No valid transactions found');
            }

            // Insert transactions
            const result = await Transaction.insertMany(validTransactions);

            return {
                importedCount: result.length,
                failedCount: transactions.length - validTransactions.length
            };

        } catch (error) {
            logger.error('Transaction Service - Import error:', error);
            throw error;
        }
    }
};

module.exports = transactionService;