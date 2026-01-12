const CreditCard = require('../models/CreditCard');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const cardService = {
    // Create new credit card
    createCard: async (cardData) => {
        try {
            const card = new CreditCard(cardData);
            await card.save();
            
            // Create notification for new card
            await Notification.create({
                user: cardData.user,
                type: 'credit_card',
                title: 'New Credit Card Added 💳',
                message: `You added a new ${card.cardType} card ending in ${card.lastFourDigits}`,
                data: { cardId: card._id, cardName: card.cardName },
                priority: 'low'
            });
            
            return card;
        } catch (error) {
            logger.error('Card Service - Create error:', error);
            throw error;
        }
    },

    // Get all cards for user
    getUserCards: async (userId) => {
        try {
            const cards = await CreditCard.find({ user: userId, isActive: true });
            
            const cardsWithStats = await Promise.all(cards.map(async (card) => {
                const transactions = await Transaction.find({
                    creditCard: card._id,
                    isDeleted: false
                });
                
                const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
                const monthlySpent = await calculateMonthlySpending(card._id);
                
                return {
                    ...card.toObject(),
                    totalSpent,
                    monthlySpent,
                    transactionCount: transactions.length,
                    utilizationPercentage: card.utilizationPercentage,
                    daysUntilPaymentDue: card.daysUntilPaymentDue
                };
            }));
            
            return cardsWithStats;
        } catch (error) {
            logger.error('Card Service - Get user cards error:', error);
            throw error;
        }
    },

    // Get card by ID
    getCardById: async (userId, cardId) => {
        try {
            const card = await CreditCard.findOne({
                _id: cardId,
                user: userId
            });
            
            if (!card) {
                throw new Error('Credit card not found');
            }
            
            // Get recent transactions
            const transactions = await Transaction.find({
                creditCard: card._id,
                isDeleted: false
            }).sort({ date: -1 }).limit(50);
            
            // Calculate spending statistics
            const monthlySpent = await calculateMonthlySpending(card._id);
            const yearlySpent = await calculateYearlySpending(card._id);
            
            return {
                ...card.toObject(),
                transactions,
                statistics: {
                    totalTransactions: await Transaction.countDocuments({ creditCard: card._id }),
                    monthlySpent,
                    yearlySpent,
                    averageTransaction: transactions.length > 0 
                        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
                        : 0
                }
            };
        } catch (error) {
            logger.error('Card Service - Get by ID error:', error);
            throw error;
        }
    },

    // Update card
    updateCard: async (userId, cardId, updateData) => {
        try {
            const card = await CreditCard.findOneAndUpdate(
                { _id: cardId, user: userId },
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!card) {
                throw new Error('Credit card not found');
            }
            
            return card;
        } catch (error) {
            logger.error('Card Service - Update error:', error);
            throw error;
        }
    },

    // Delete card (soft delete)
    deleteCard: async (userId, cardId) => {
        try {
            const card = await CreditCard.findOneAndUpdate(
                { _id: cardId, user: userId },
                { isActive: false },
                { new: true }
            );
            
            if (!card) {
                throw new Error('Credit card not found');
            }
            
            return true;
        } catch (error) {
            logger.error('Card Service - Delete error:', error);
            throw error;
        }
    },

    // Get card statistics
    getCardStatistics: async (userId) => {
        try {
            const cards = await CreditCard.find({ user: userId, isActive: true });
            
            const statistics = {
                totalCards: cards.length,
                totalCreditLimit: cards.reduce((sum, card) => sum + card.creditLimit, 0),
                totalCurrentBalance: cards.reduce((sum, card) => sum + card.currentBalance, 0),
                totalAvailableCredit: cards.reduce((sum, card) => sum + card.availableCredit, 0),
                averageUtilization: cards.length > 0 
                    ? cards.reduce((sum, card) => sum + card.utilizationPercentage, 0) / cards.length 
                    : 0,
                cardsByType: cards.reduce((acc, card) => {
                    acc[card.cardType] = (acc[card.cardType] || 0) + 1;
                    return acc;
                }, {}),
                upcomingPayments: cards.filter(card => card.daysUntilPaymentDue <= 7).length,
                highUtilizationCards: cards.filter(card => card.utilizationPercentage > 80).length
            };
            
            // Calculate monthly spending per card
            statistics.monthlySpending = await Promise.all(
                cards.map(async (card) => ({
                    cardName: card.cardName,
                    monthlySpent: await calculateMonthlySpending(card._id),
                    utilization: card.utilizationPercentage
                }))
            );
            
            return statistics;
        } catch (error) {
            logger.error('Card Service - Statistics error:', error);
            throw error;
        }
    },

    // Process payment on card
    processPayment: async (userId, cardId, paymentData) => {
        try {
            const { amount, date, description } = paymentData;
            
            const card = await CreditCard.findOne({
                _id: cardId,
                user: userId
            });
            
            if (!card) {
                throw new Error('Credit card not found');
            }
            
            // Validate payment amount
            if (amount <= 0) {
                throw new Error('Payment amount must be positive');
            }
            
            if (amount > card.currentBalance) {
                throw new Error('Payment amount exceeds current balance');
            }
            
            // Update card balance
            const oldBalance = card.currentBalance;
            card.currentBalance -= amount;
            card.lastUsed = new Date();
            
            await card.save();
            
            // Create transaction record for payment
            const paymentTransaction = await Transaction.create({
                user: userId,
                amount: amount,
                description: description || `Credit card payment - ${card.cardName}`,
                date: date ? new Date(date) : new Date(),
                type: 'expense',
                paymentMethod: 'bank_transfer',
                notes: `Payment for credit card: ${card.cardName}`,
                tags: ['credit-card-payment']
            });
            
            // Create notification for payment
            await Notification.create({
                user: userId,
                type: 'credit_card',
                title: 'Credit Card Payment Processed ✅',
                message: `Payment of ${amount} processed for ${card.cardName}`,
                data: { 
                    cardId: card._id, 
                    cardName: card.cardName,
                    amount: amount,
                    oldBalance: oldBalance,
                    newBalance: card.currentBalance,
                    transactionId: paymentTransaction._id
                },
                priority: 'low'
            });
            
            return {
                card: card,
                payment: {
                    amount,
                    date: date || new Date(),
                    description,
                    newBalance: card.currentBalance,
                    transactionId: paymentTransaction._id
                }
            };
        } catch (error) {
            logger.error('Card Service - Process payment error:', error);
            throw error;
        }
    },

    // Check for upcoming payments
    checkUpcomingPayments: async (userId) => {
        try {
            const cards = await CreditCard.find({ user: userId, isActive: true });
            
            const upcomingPayments = cards
                .filter(card => card.daysUntilPaymentDue <= 7 && card.currentBalance > 0)
                .map(card => ({
                    cardId: card._id,
                    cardName: card.cardName,
                    dueDate: card.nextPaymentDueDate,
                    daysUntilDue: card.daysUntilPaymentDue,
                    amountDue: card.minPaymentAmount,
                    currentBalance: card.currentBalance,
                    isOverdue: card.daysUntilPaymentDue < 0
                }));
            
            return upcomingPayments;
        } catch (error) {
            logger.error('Card Service - Check upcoming payments error:', error);
            throw error;
        }
    }
};

// Helper function to calculate monthly spending
async function calculateMonthlySpending(cardId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const transactions = await Transaction.find({
        creditCard: cardId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: false
    });
    
    return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// Helper function to calculate yearly spending
async function calculateYearlySpending(cardId) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    
    const transactions = await Transaction.find({
        creditCard: cardId,
        date: { $gte: startOfYear, $lte: endOfYear },
        isDeleted: false
    });
    
    return transactions.reduce((sum, t) => sum + t.amount, 0);
}

module.exports = cardService;