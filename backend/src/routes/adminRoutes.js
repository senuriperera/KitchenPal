const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');

// Admin bell notifications (recipe_pending)
router.get('/notifications/bell', authenticate, NotificationController.getAdminBellNotifications);
router.patch('/notifications/bell/:id/read', authenticate, NotificationController.markAdminBellAsRead);
router.patch('/notifications/bell/read-all', authenticate, NotificationController.markAllAdminBellAsRead);

module.exports = router;
