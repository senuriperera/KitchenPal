const db = require('../config/database');

/**
 * Daily expiry detection job.
 *
 * - Runs the ingredient_batches query for batches expiring in 0–3 days.
 * - For each batch, checks if an expiry_alert notification already exists for today.
 * - If not, fetches all active staff/branch_manager users for that branch.
 * - Inserts one notification row per staff user per batch.
 */
async function runExpiryNotificationsJob() {
    console.log('\n Running daily expiry notifications job...');

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Find expiring batches within 3 days
        const expiringResult = await client.query(
            `SELECT
         ib.batch_id,
         ib.ingredient_id,
         ib.expiry_date,
         ib.remaining_base_quantity,
         si.branch_id,
         si.name,
         (ib.expiry_date - CURRENT_DATE) AS days_until_expiry
       FROM ingredient_batches ib
       JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
       WHERE ib.is_depleted = false
         AND (ib.expiry_date - CURRENT_DATE) <= 3
         AND (ib.expiry_date - CURRENT_DATE) >= 0
         AND si.deleted_at IS NULL
         AND ib.deleted_at IS NULL`
        );

        if (expiringResult.rows.length === 0) {
            console.log('No expiring batches found for notifications.');
            await client.query('COMMIT');
            return;
        }

        for (const row of expiringResult.rows) {
            const {
                batch_id,
                ingredient_id,
                expiry_date,
                branch_id,
                name,
                days_until_expiry,
            } = row;

            // Check if a notification already exists today for this ingredient + branch
            const existingNotif = await client.query(
                `SELECT notification_id
         FROM notifications
         WHERE ingredient_id = $1
           AND branch_id = $2
           AND notification_type = 'expiry_alert'
           AND DATE(created_at) = CURRENT_DATE
         LIMIT 1`,
                [ingredient_id, branch_id]
            );

            if (existingNotif.rows.length > 0) {
                continue;
            }

            // Find all active staff and branch managers for this branch
            const staffResult = await client.query(
                `SELECT user_id
         FROM users
         WHERE branch_id = $1
           AND role IN ('staff', 'STAFF', 'branch_manager', 'BRANCH_MANAGER', 'manager', 'MANAGER')
           AND is_active = true`,
                [branch_id]
            );

            if (staffResult.rows.length === 0) {
                continue;
            }

            const title = 'Expiry Alert';
            const message = `${name} is expiring in ${days_until_expiry} day${days_until_expiry === 1 ? '' : 's'
                }`;

            for (const staff of staffResult.rows) {
                await client.query(
                    `INSERT INTO notifications (
             user_id,
             branch_id,
             ingredient_id,
             title,
             message,
             notification_type,
             status,
             days_until_expiry,
             is_read,
             created_at
           ) VALUES (
             $1, $2, $3, $4, $5, 'expiry_alert', 'unread', $6, false, NOW()
           )`,
                    [
                        staff.user_id,
                        branch_id,
                        ingredient_id,
                        title,
                        message,
                        days_until_expiry,
                    ]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Daily expiry notifications job completed.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Expiry notifications job failed:', err.message);
    } finally {
        client.release();
    }
}

module.exports = {
    runExpiryNotificationsJob,
};
