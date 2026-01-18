const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', auth, notificationController.getNotifications);
router.put('/:id/read', auth, notificationController.markAsRead);
router.put('/read-all', auth, notificationController.markAllAsRead);
router.delete('/:id', auth, notificationController.deleteNotification);
router.delete('/', auth, notificationController.clearAllNotifications);
router.get('/stats', auth, notificationController.getNotificationStats);
router.post('/', auth, notificationController.createSystemNotification);
router.post('/process-scheduled', auth, notificationController.processScheduledNotifications);
router.post('/send-email', auth, notificationController.sendEmailNotifications);

module.exports = router;
