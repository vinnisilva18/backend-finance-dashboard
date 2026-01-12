const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/email.service');

// All routes require authentication
router.use(authenticate);

// Test email configuration
router.post('/test', async (req, res) => {
    try {
        await emailService.testEmailConfig();
        
        res.json({
            success: true,
            message: 'Email configuration test successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error testing email configuration'
        });
    }
});

// Send test email to user
router.post('/send-test', async (req, res) => {
    try {
        await emailService.sendWelcomeEmail({
            name: req.user.name,
            email: req.user.email
        });
        
        res.json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error sending test email'
        });
    }
});

module.exports = router;