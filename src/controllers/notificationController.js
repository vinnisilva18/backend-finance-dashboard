const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const notificationController = {
    // Get all notifications for user
    getNotifications: async (req, res) => {
        try {
            const userId = req.user.userId;
            const filters = req.query;
            
            const result = await notificationService.getUserNotifications(userId, filters);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching notifications'
            });
        }
    },

    // Mark notification as read
    markAsRead: async (req, res) => {
        try {
            const userId = req.user.userId;
            const notificationId = req.params.id;
            
            const notification = await notificationService.markAsRead(userId, notificationId);
            
            res.json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });
        } catch (error) {
            logger.error('Mark as read error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error marking notification as read'
            });
        }
    },

    // Mark all notifications as read
    markAllAsRead: async (req, res) => {
        try {
            const userId = req.user.userId;
            
            const count = await notificationService.markAllAsRead(userId);
            
            res.json({
                success: true,
                message: `${count} notifications marked as read`
            });
        } catch (error) {
            logger.error('Mark all as read error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error marking all notifications as read'
            });
        }
    },

    // Delete notification
    deleteNotification: async (req, res) => {
        try {
            const userId = req.user.userId;
            const notificationId = req.params.id;
            
            await notificationService.deleteNotification(userId, notificationId);
            
            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            logger.error('Delete notification error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error deleting notification'
            });
        }
    },

    // Clear all notifications
    clearAllNotifications: async (req, res) => {
        try {
            const userId = req.user.userId;
            
            await notificationService.clearAllNotifications(userId);
            
            res.json({
                success: true,
                message: 'All notifications cleared'
            });
        } catch (error) {
            logger.error('Clear all notifications error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error clearing all notifications'
            });
        }
    },

    // Get notification statistics
    getNotificationStats: async (req, res) => {
        try {
            const userId = req.user.userId;
            
            const stats = await notificationService.getNotificationStats(userId);
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Get notification stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching notification statistics'
            });
        }
    },

    // Create system notification
    createSystemNotification: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { title, message, data } = req.body;
            
            const notification = await notificationService.createSystemNotification(userId, title, message, data);
            
            res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });
        } catch (error) {
            logger.error('Create system notification error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error creating notification'
            });
        }
    },

    // Process scheduled notifications
    processScheduledNotifications: async (req, res) => {
        try {
            const results = await notificationService.processScheduledNotifications();
            
            res.json({
                success: true,
                message: 'Scheduled notifications processed',
                data: results
            });
        } catch (error) {
            logger.error('Process scheduled notifications error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error processing scheduled notifications'
            });
        }
    },

    // Send email notifications
    sendEmailNotifications: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { notificationIds } = req.body;
            
            if (!notificationIds || !Array.isArray(notificationIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Notification IDs array is required'
                });
            }
            
            const result = await notificationService.sendEmailNotifications(userId, notificationIds);
            
            res.json({
                success: true,
                message: 'Email notifications sent',
                data: result
            });
        } catch (error) {
            logger.error('Send email notifications error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error sending email notifications'
            });
        }
    }
};

module.exports = notificationController;