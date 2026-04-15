const cron = require('node-cron');
const db = require('../config/database');

/**
 * Auto-logs expired ingredient batches as waste
 * Runs daily at midnight (Asia/Colombo timezone)
 *
 * Finds all batches where:
 * - expiry_date <= TODAY (already expired)
 * - is_depleted = false (not already logged)
 *
 * For each: creates a waste_logs entry with reason='expired'
 */
function startAutoExpiryWasteLoggingJob() {
  // Run at 12:00 AM every day (Asia/Colombo timezone)
  const job = cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🕐 Auto-expiry waste logging job started...');

      const client = await db.getClient();

      try {
        await client.query('BEGIN');

        // Find all expired batches that haven't been logged yet
        const expiredBatchesRes = await client.query(`
          SELECT
            ib.batch_id,
            ib.ingredient_id,
            si.branch_id,
            ib.remaining_base_quantity,
            si.base_unit_id,
            ib.expiry_date,
            si.name
          FROM ingredient_batches ib
          JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
          WHERE
            ib.expiry_date <= CURRENT_DATE
            AND ib.is_depleted = false
            AND si.deleted_at IS NULL
          ORDER BY ib.expiry_date ASC
        `);

        if (expiredBatchesRes.rows.length === 0) {
          console.log('✅ No expired batches found');
          await client.query('COMMIT');
          client.release();
          return;
        }

        // Use system user (ID 1) for automated logging
        const SYSTEM_USER_ID = 1;
        let loggedCount = 0;

        for (const batch of expiredBatchesRes.rows) {
          // Insert waste log
          await client.query(
            `INSERT INTO waste_logs
             (branch_id, ingredient_id, batch_id, quantity_wasted, unit_id, reason, logged_by)
             VALUES ($1, $2, $3, $4, $5, 'expired', $6)`,
            [
              batch.branch_id,
              batch.ingredient_id,
              batch.batch_id,
              batch.remaining_base_quantity,
              batch.base_unit_id,
              SYSTEM_USER_ID
            ]
          );

          // Mark batch as depleted
          await client.query(
            `UPDATE ingredient_batches SET is_depleted = true WHERE batch_id = $1`,
            [batch.batch_id]
          );

          loggedCount++;
          console.log(`  ✓ Logged waste for ${batch.name} (expired ${batch.expiry_date})`);
        }

        await client.query('COMMIT');
        console.log(`✅ Auto-expiry waste logging completed: ${loggedCount} batches logged`);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ Auto-expiry waste logging job failed:', error.message);
    }
  }, {
    timezone: 'Asia/Colombo'
  });

  return job;
}

module.exports = { startAutoExpiryWasteLoggingJob };
