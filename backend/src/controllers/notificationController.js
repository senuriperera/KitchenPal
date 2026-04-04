const NotificationModel = require('../models/Notification');
const db = require('../config/database');

class NotificationController {
    // Get expiry-nearing notifications for the logged-in user
    // GET /api/notifications
    // Returns all expiring ingredients (within 7 days) regardless of notification status
    static async getExpiryNotificationsForUser(req, res) {
        try {
            const user_id = req.user.user_id;
            const branch_id = req.user.branch_id;
            const { days = 7 } = req.query;

            if (!user_id || !branch_id) {
                return res.status(400).json({ error: 'User branch context missing' });
            }

            // Query all expiring batches for the branch (same as homepage)
            // This ensures consistency between homepage and notifications page
            const query = `
                SELECT DISTINCT
                    ib.batch_id,
                    ib.ingredient_id,
                    ib.expiry_date,
                    ib.remaining_base_quantity,
                    si.name,
                    si.image_url,
                    st.name AS storage_type_name,
                    bu.code AS base_unit_code,
                    (ib.expiry_date - CURRENT_DATE) AS days_until_expiry
                FROM ingredient_batches ib
                JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                JOIN storage_types st ON si.storage_type_id = st.storage_type_id
                JOIN units bu ON ib.base_unit_id = bu.unit_id
                WHERE si.branch_id = $1
                    AND ib.is_depleted = false
                    AND ib.expiry_date <= CURRENT_DATE + ($2 || ' days')::INTERVAL
                    AND ib.expiry_date >= CURRENT_DATE
                ORDER BY ib.expiry_date ASC
            `;

            const result = await db.query(query, [branch_id, days]);

            // Map to match Flutter's ExpiryNotification model field names
            const items = result.rows.map(row => ({
                batch_id: row.batch_id,
                ingredient_id: row.ingredient_id,
                expiry_date: row.expiry_date,
                remaining_base_quantity: row.remaining_base_quantity,
                name: row.name,
                image_url: row.image_url,
                storage_type_name: row.storage_type_name,
                base_unit_code: row.base_unit_code,
                days_until_expiry: parseInt(row.days_until_expiry, 10)
            }));

            res.json({ items });
        } catch (error) {
            console.error('Get expiry notifications error:', error);
            res.status(500).json({ error: 'Failed to fetch expiry notifications' });
        }
    }
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

            // Broadcast notification/inventory-related change
            const io = req.app && req.app.get ? req.app.get('io') : null;
            if (io) {
                io.emit('notifications:changed', {
                    action: 'created',
                    branch_id,
                    notification,
                });
            }

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

            const io = req.app && req.app.get ? req.app.get('io') : null;
            if (io) {
                io.emit('notifications:changed', {
                    action: 'resolved',
                    branch_id: notification.branch_id,
                    notification,
                });
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
            const io = req.app && req.app.get ? req.app.get('io') : null;
            if (io) {
                io.emit('notifications:changed', {
                    action: 'deleted',
                    id,
                });
            }

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

            const io = req.app && req.app.get ? req.app.get('io') : null;
            if (io) {
                io.emit('notifications:changed', {
                    action: 'expiry_batch_created',
                    branch_id,
                    notifications,
                });
            }

            res.json({
                message: `Created ${notifications.length} expiry notifications`,
                notifications,
            });
        } catch (error) {
            console.error('Create expiry notifications error:', error);
            res.status(500).json({ error: 'Failed to create expiry notifications' });
        }
    }

    // Acknowledge a single expiry notification for the logged-in user
    static async acknowledgeNotification(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;

            const result = await db.query(
                `UPDATE notifications SET
                   status = 'read',
                   is_read = true,
                   acknowledged_at = NOW()
                 WHERE notification_id = $1
                   AND user_id = $2
                   AND notification_type = 'expiry_alert'
                 RETURNING notification_id`,
                [id, user_id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ message: 'Notification acknowledged' });
        } catch (error) {
            console.error('Acknowledge notification error:', error);
            res.status(500).json({ error: 'Failed to acknowledge notification' });
        }
    }

    // Get bell notifications (recipe_approved, recipe_rejected, expiry_alert) for the logged-in user
    static async getBellNotifications(req, res) {
        try {
            const user_id = req.user.user_id;

            const result = await db.query(
                `SELECT
                    n.notification_id,
                    n.title,
                    n.message,
                    n.notification_type,
                    n.status,
                    n.is_read,
                    n.created_at,
                    n.ingredient_id
                 FROM notifications n
                 WHERE n.user_id = $1
                   AND n.notification_type IN ('recipe_approved', 'recipe_rejected', 'expiry_alert')
                 ORDER BY n.created_at DESC
                 LIMIT 50`,
                [user_id]
            );

            const notifications = result.rows;
            const unread_count = notifications.filter(n => !n.is_read).length;

            res.json({ notifications, unread_count });
        } catch (error) {
            console.error('Get bell notifications error:', error);
            res.status(500).json({ error: 'Failed to fetch bell notifications' });
        }
    }

    // Mark a single bell notification as read
    static async markBellAsRead(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;

            const result = await db.query(
                `UPDATE notifications SET
                   status = 'read',
                   is_read = true,
                   acknowledged_at = NOW()
                 WHERE notification_id = $1
                   AND user_id = $2
                 RETURNING notification_id`,
                [id, user_id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ message: 'Notification marked as read' });
        } catch (error) {
            console.error('Mark bell as read error:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    // Mark all bell notifications as read for the logged-in user
    static async markAllBellAsRead(req, res) {
        try {
            const user_id = req.user.user_id;

            await db.query(
                `UPDATE notifications SET
                   status = 'read',
                   is_read = true,
                   acknowledged_at = NOW()
                 WHERE user_id = $1
                   AND is_read = false
                   AND notification_type IN ('recipe_approved', 'recipe_rejected', 'expiry_alert')`,
                [user_id]
            );

            res.json({ message: 'All notifications marked as read', unread_count: 0 });
        } catch (error) {
            console.error('Mark all bell as read error:', error);
            res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    }

    // Get admin bell notifications (recipe_pending) for the logged-in user
    static async getAdminBellNotifications(req, res) {
        try {
            const user_id = req.user.user_id;
            console.log('Admin fetching notifications for user_id:', user_id);

            // First, check if there are ANY recipe_pending notifications in the database
            const allPendingResult = await db.query(
                `SELECT COUNT(*) as count FROM notifications WHERE notification_type = 'recipe_pending'`
            );
            console.log('Total recipe_pending notifications in DB:', allPendingResult.rows[0].count);

            const result = await db.query(
                `SELECT
                    n.notification_id,
                    n.title,
                    n.message,
                    n.notification_type,
                    n.status,
                    n.is_read,
                    n.created_at,
                    b.name AS branch_name
                 FROM notifications n
                 LEFT JOIN branches b ON n.branch_id = b.branch_id
                 WHERE n.user_id = $1
                   AND n.notification_type = 'recipe_pending'
                 ORDER BY n.created_at DESC
                 LIMIT 50`,
                [user_id]
            );

            console.log('Admin notifications found for this user:', result.rows.length);
            const notifications = result.rows;
            const unread_count = notifications.filter(n => !n.is_read).length;

            res.json({ notifications, unread_count });
        } catch (error) {
            console.error('Get admin bell notifications error:', error);
            res.status(500).json({ error: 'Failed to fetch admin bell notifications' });
        }
    }

    // Mark a single admin bell notification as read
    static async markAdminBellAsRead(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;

            const result = await db.query(
                `UPDATE notifications SET
                   status = 'read',
                   is_read = true,
                   acknowledged_at = NOW()
                 WHERE notification_id = $1
                   AND user_id = $2
                 RETURNING notification_id`,
                [id, user_id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ message: 'Notification marked as read' });
        } catch (error) {
            console.error('Mark admin bell as read error:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    // Mark all admin bell notifications as read for the logged-in user
    static async markAllAdminBellAsRead(req, res) {
        try {
            const user_id = req.user.user_id;

            await db.query(
                `UPDATE notifications SET
                   status = 'read',
                   is_read = true,
                   acknowledged_at = NOW()
                 WHERE user_id = $1
                   AND is_read = false
                   AND notification_type = 'recipe_pending'`,
                [user_id]
            );

            res.json({ message: 'All notifications marked as read', unread_count: 0 });
        } catch (error) {
            console.error('Mark all admin bell as read error:', error);
            res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    }
}

module.exports = NotificationController;
