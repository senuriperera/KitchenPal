const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');

// Routes
// Mobile expiry-nearing notifications for the logged-in user
router.get('/', authenticate, NotificationController.getExpiryNotificationsForUser);

router.get('/branch/:branch_id', authenticate, NotificationController.getAllNotifications);
router.get('/:id', authenticate, NotificationController.getNotificationById);
router.post('/', authenticate, NotificationController.createNotification);
router.post('/branch/:branch_id/auto-create', authenticate, NotificationController.createExpiryNotifications);
router.put('/:id/resolve', authenticate, NotificationController.resolveNotification);
router.patch('/:id/acknowledge', authenticate, NotificationController.acknowledgeNotification);
router.delete('/:id', authenticate, NotificationController.deleteNotification);

module.exports = router;
