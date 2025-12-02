const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');

// Routes
router.get('/branch/:branch_id', authenticate, NotificationController.getAllNotifications);
router.get('/:id', authenticate, NotificationController.getNotificationById);
router.post('/', authenticate, NotificationController.createNotification);
router.post('/branch/:branch_id/auto-create', authenticate, NotificationController.createExpiryNotifications);
router.put('/:id/resolve', authenticate, NotificationController.resolveNotification);
router.delete('/:id', authenticate, NotificationController.deleteNotification);

module.exports = router;
