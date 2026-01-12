const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

const notificationService = {
    // Create notification
    createNotification: async (notificationData) => {
        try {
            const notification = new Notification(notificationData);
            await notification.save();
            
            logger.info(`Notification created: ${notification._id} for user: ${notificationData.user}`);
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - Create error:', error);
            throw error;
        }
    },

    // Get notifications for user
    getUserNotifications: async (userId, filters = {}) => {
        try {
            const { read, type, limit = 50, page = 1 } = filters;
            
            const query = { user: userId };
            
            if (read !== undefined) {
                query.isRead = read === 'true';
            }
            
            if (type) {
                query.type = type;
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await Notification.countDocuments(query);
            const unreadCount = await Notification.countDocuments({ 
                user: userId, 
                isRead: false 
            });
            
            return {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                summary: {
                    total,
                    unreadCount,
                    readCount: total - unreadCount
                }
            };
        } catch (error) {
            logger.error('Notification Service - Get user notifications error:', error);
            throw error;
        }
    },

    // Mark notification as read
    markAsRead: async (userId, notificationId) => {
        try {
            const notification = await Notification.findOne({
                _id: notificationId,
                user: userId
            });
            
            if (!notification) {
                throw new Error('Notification not found');
            }
            
            await notification.markAsRead();
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - Mark as read error:', error);
            throw error;
        }
    },

    // Mark all notifications as read
    markAllAsRead: async (userId) => {
        try {
            const result = await Notification.updateMany(
                { user: userId, isRead: false },
                { 
                    isRead: true,
                    readAt: new Date()
                }
            );
            
            return result.modifiedCount;
        } catch (error) {
            logger.error('Notification Service - Mark all as read error:', error);
            throw error;
        }
    },

    // Delete notification
    deleteNotification: async (userId, notificationId) => {
        try {
            const notification = await Notification.findOneAndDelete({
                _id: notificationId,
                user: userId
            });
            
            if (!notification) {
                throw new Error('Notification not found');
            }
            
            return true;
        } catch (error) {
            logger.error('Notification Service - Delete error:', error);
            throw error;
        }
    },

    // Clear all notifications
    clearAllNotifications: async (userId) => {
        try {
            await Notification.deleteMany({ user: userId });
            
            return true;
        } catch (error) {
            logger.error('Notification Service - Clear all error:', error);
            throw error;
        }
    },

    // Get notification statistics
    getNotificationStats: async (userId) => {
        try {
            const stats = await Notification.aggregate([
                { $match: { user: userId } },
                { 
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        unreadCount: {
                            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                        }
                    }
                },
                { $sort: { count: -1 } }
            ]);
            
            const totalStats = await Notification.aggregate([
                { $match: { user: userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        unread: {
                            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                        }
                    }
                }
            ]);
            
            // Get notification trends (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const dailyTrend = await Notification.aggregate([
                {
                    $match: {
                        user: userId,
                        createdAt: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                        },
                        count: { $sum: 1 },
                        unread: {
                            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            return {
                byType: stats,
                total: totalStats[0] || { total: 0, unread: 0 },
                dailyTrend
            };
        } catch (error) {
            logger.error('Notification Service - Stats error:', error);
            throw error;
        }
    },

    // Create budget alert notification
    createBudgetAlert: async (userId, category, spent, budget) => {
        try {
            const percentage = (spent / budget) * 100;
            
            if (percentage < 75) {
                return null; // Only create alerts for 75%+ utilization
            }
            
            let title, message, priority;
            
            if (percentage >= 100) {
                title = 'Budget Exceeded! ⚠️';
                message = `You've exceeded your ${category.name} budget by ${Math.round(percentage - 100)}%`;
                priority = 'urgent';
            } else if (percentage >= 90) {
                title = 'Budget Warning';
                message = `You've used ${Math.round(percentage)}% of your ${category.name} budget`;
                priority = 'high';
            } else {
                title = 'Budget Alert';
                message = `You've used ${Math.round(percentage)}% of your ${category.name} budget`;
                priority = 'medium';
            }
            
            const notification = await this.createNotification({
                user: userId,
                type: 'budget',
                title,
                message,
                priority,
                data: { 
                    categoryId: category._id, 
                    categoryName: category.name,
                    spent,
                    budget,
                    percentage: Math.round(percentage)
                },
                category: 'budget',
                actionUrl: `/categories/${category._id}`
            });
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - Budget alert error:', error);
            throw error;
        }
    },

    // Create goal progress notification
    createGoalProgressNotification: async (userId, goal, progress) => {
        try {
            if (progress < 25) {
                return null; // Only notify for significant progress
            }
            
            let title, message, priority;
            
            if (progress >= 100) {
                title = 'Goal Completed! 🎉';
                message = `Congratulations! You've completed your goal: ${goal.name}`;
                priority = 'high';
            } else if (progress >= 75) {
                title = 'Goal Progress Update';
                message = `You're ${Math.round(progress)}% towards your goal: ${goal.name}`;
                priority = 'medium';
            } else if (progress >= 50) {
                title = 'Halfway There! 🎯';
                message = `You're halfway to your goal: ${goal.name}`;
                priority = 'low';
            } else {
                return null;
            }
            
            const notification = await this.createNotification({
                user: userId,
                type: 'goal',
                title,
                message,
                priority,
                data: { 
                    goalId: goal._id, 
                    goalName: goal.name, 
                    progress: Math.round(progress) 
                },
                category: 'goal',
                actionUrl: `/goals/${goal._id}`
            });
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - Goal progress error:', error);
            throw error;
        }
    },

    // Create credit card payment due notification
    createCreditCardPaymentNotification: async (userId, card, daysUntilDue) => {
        try {
            let title, message, priority;
            
            if (daysUntilDue <= 0) {
                title = 'Credit Card Payment Overdue! ⚠️';
                message = `Your ${card.cardName} payment is ${Math.abs(daysUntilDue)} days overdue`;
                priority = 'urgent';
            } else if (daysUntilDue <= 3) {
                title = 'Credit Card Payment Due Soon';
                message = `Your ${card.cardName} payment is due in ${daysUntilDue} days`;
                priority = 'high';
            } else if (daysUntilDue <= 7) {
                title = 'Credit Card Payment Reminder';
                message = `Your ${card.cardName} payment is due in ${daysUntilDue} days`;
                priority = 'medium';
            } else {
                return null; // Only notify within 7 days
            }
            
            const notification = await this.createNotification({
                user: userId,
                type: 'credit_card',
                title,
                message,
                priority,
                data: { 
                    cardId: card._id, 
                    cardName: card.cardName,
                    dueDate: card.nextPaymentDueDate,
                    daysUntilDue,
                    amountDue: card.minPaymentAmount,
                    currentBalance: card.currentBalance
                },
                category: 'credit_card',
                actionUrl: `/credit-cards/${card._id}`
            });
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - Credit card payment error:', error);
            throw error;
        }
    },

    // Create large transaction notification
    createLargeTransactionNotification: async (userId, transaction) => {
        try {
            // Only notify for large expenses
            if (transaction.type !== 'expense' || transaction.amount < 500) {
                return null;
            }
            
            const notification = await this.createNotification({
                user: userId,
                type: 'transaction',
                title: 'Large Transaction Recorded 💸',
                message: `Large ${transaction.type} of $${transaction.amount} recorded: ${transaction.description}`,
                priority: 'medium',
                data: { 
                    transactionId: transaction._id, 
                    amount: transaction.amount,
                    description: transaction.description,
                    category: transaction.category,
                    date: transaction.date
                },
                category: 'transaction',
                actionUrl: `/transactions/${transaction._id}`
            });
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - Large transaction error:', error);
            throw error;
        }
    },

    // Create system notification
    createSystemNotification: async (userId, title, message, data = {}) => {
        try {
            const notification = await this.createNotification({
                user: userId,
                type: 'system',
                title,
                message,
                priority: 'medium',
                data,
                category: 'system'
            });
            
            return notification;
        } catch (error) {
            logger.error('Notification Service - System notification error:', error);
            throw error;
        }
    },

    // Process scheduled notifications
    processScheduledNotifications: async () => {
        try {
            const now = new Date();
            
            // Find notifications scheduled for now or earlier
            const scheduledNotifications = await Notification.find({
                scheduledFor: { $lte: now },
                isRead: false
            });
            
            const results = [];
            
            for (const notification of scheduledNotifications) {
                // Mark as ready for delivery (remove scheduledFor)
                notification.scheduledFor = null;
                await notification.save();
                
                results.push({
                    notificationId: notification._id,
                    userId: notification.user,
                    title: notification.title,
                    processed: true
                });
            }
            
            return results;
        } catch (error) {
            logger.error('Notification Service - Process scheduled error:', error);
            throw error;
        }
    },

    // Send email notifications (integration with email service)
    sendEmailNotifications: async (userId, notificationIds) => {
        try {
            const user = await User.findById(userId);
            
            if (!user || !user.notificationsEnabled) {
                return { sent: 0, failed: 0 };
            }
            
            const notifications = await Notification.find({
                _id: { $in: notificationIds },
                user: userId
            });
            
            const emailService = require('./email.service');
            let sent = 0;
            let failed = 0;
            
            for (const notification of notifications) {
                try {
                    await emailService.sendNotificationEmail(user, notification);
                    sent++;
                } catch (error) {
                    logger.error(`Failed to send email for notification ${notification._id}:`, error);
                    failed++;
                }
            }
            
            return { sent, failed };
        } catch (error) {
            logger.error('Notification Service - Send emails error:', error);
            throw error;
        }
    }
};

module.exports = notificationService;