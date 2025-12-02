const NotificationModel = require('../models/Notification');

class NotificationController {
    // Get all notifications for a branch
    static async getAllNotifications(req, res) {
        try {
            const { branch_id } = req.params;
            const { is_resolved } = req.query;

            const resolvedFilter = is_resolved === 'true';
            const notifications = await NotificationModel.getAllByBranch(branch_id, resolvedFilter);

            res.json({ notifications });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    // Get notification by ID
    static async getNotificationById(req, res) {
        try {
            const { id } = req.params;
            const notification = await NotificationModel.findById(id);

            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ notification });
        } catch (error) {
            console.error('Get notification error:', error);
            res.status(500).json({ error: 'Failed to fetch notification' });
        }
    }

    // Create notification
    static async createNotification(req, res) {
        try {
            const { branch_id, ingredient_id, type, message, expiry_date } = req.body;

            const notification = await NotificationModel.create({
                branch_id,
                ingredient_id,
                type,
                message,
                expiry_date,
            });

            res.status(201).json({
                message: 'Notification created successfully',
                notification,
            });
        } catch (error) {
            console.error('Create notification error:', error);
            res.status(500).json({ error: 'Failed to create notification' });
        }
    }

    // Mark notification as resolved
    static async resolveNotification(req, res) {
        try {
            const { id } = req.params;
            const notification = await NotificationModel.resolve(id);

            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({
                message: 'Notification resolved successfully',
                notification,
            });
        } catch (error) {
            console.error('Resolve notification error:', error);
            res.status(500).json({ error: 'Failed to resolve notification' });
        }
    }

    // Delete notification
    static async deleteNotification(req, res) {
        try {
            const { id } = req.params;
            await NotificationModel.delete(id);

            res.json({ message: 'Notification deleted successfully' });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({ error: 'Failed to delete notification' });
        }
    }

    // Auto-create expiry notifications
    static async createExpiryNotifications(req, res) {
        try {
            const { branch_id } = req.params;
            const { days = 7 } = req.body;

            const notifications = await NotificationModel.createExpiryNotifications(branch_id, days);

            res.json({
                message: `Created ${notifications.length} expiry notifications`,
                notifications,
            });
        } catch (error) {
            console.error('Create expiry notifications error:', error);
            res.status(500).json({ error: 'Failed to create expiry notifications' });
        }
    }
}

module.exports = NotificationController;
