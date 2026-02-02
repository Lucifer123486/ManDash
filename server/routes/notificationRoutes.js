const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

router.use(protect);

// @desc    Send custom message to a user
// @route   POST /api/notifications/send
// @access  Private/Admin
router.post('/send', authorize('admin'), async (req, res) => {
    try {
        const { userId, message, title } = req.body;

        const success = await notificationService.sendCustomMessage(userId, message, title);

        res.status(200).json({
            success,
            message: success ? 'Notification sent' : 'Failed to send notification'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending notification',
            error: error.message
        });
    }
});

// @desc    Send bulk message to all users of a role
// @route   POST /api/notifications/bulk
// @access  Private/Admin
router.post('/bulk', authorize('admin'), async (req, res) => {
    try {
        const { role, message, title } = req.body;

        const count = await notificationService.sendBulkMessage(role, message, title);

        res.status(200).json({
            success: true,
            message: `Notification sent to ${count} users`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending bulk notification',
            error: error.message
        });
    }
});

// @desc    Send festive SMS to all clients
// @route   POST /api/notifications/festive
// @access  Private/Admin
router.post('/festive', authorize('admin'), async (req, res) => {
    try {
        const { message, title } = req.body;

        const count = await notificationService.sendBulkMessage('client', message, title || 'Festive Greetings');

        res.status(200).json({
            success: true,
            message: `Festive notification sent to ${count} clients`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending festive notification',
            error: error.message
        });
    }
});

// @desc    Send service reminder to clients
// @route   POST /api/notifications/service
// @access  Private/Admin
router.post('/service', authorize('admin'), async (req, res) => {
    try {
        const { message, title } = req.body;

        const count = await notificationService.sendBulkMessage('client', message, title || 'Service Reminder');

        res.status(200).json({
            success: true,
            message: `Service notification sent to ${count} clients`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending service notification',
            error: error.message
        });
    }
});

module.exports = router;
