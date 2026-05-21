const cron = require('node-cron');
const db = require('../config/database');


async function runAutoExpiryWasteLogging() {
  console.log('Auto-expiry waste logging job started...');

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

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
        AND ib.deleted_at IS NULL
      ORDER BY ib.expiry_date ASC
    `);

    if (expiredBatchesRes.rows.length === 0) {
      console.log('No expired batches found');
      await client.query('COMMIT');
      client.release();
      return;
    }

    const SYSTEM_USER_ID = 1;
    let loggedCount = 0;

    for (const batch of expiredBatchesRes.rows) {
      let unit_id = batch.base_unit_id;
      if (!unit_id) {
        const unitFallback = await client.query(
          `SELECT mi.base_unit_id FROM stock_ingredients si
           JOIN master_ingredients mi ON si.master_ingredient_id = mi.master_ingredient_id
           WHERE si.ingredient_id = $1`,
          [batch.ingredient_id]
        );
        unit_id = unitFallback.rows[0]?.base_unit_id || null;
      }

      await client.query(
        `INSERT INTO waste_logs
         (branch_id, ingredient_id, batch_id, quantity_wasted, unit_id, reason, logged_by)
         VALUES ($1, $2, $3, $4, $5, 'expired', $6)`,
        [
          batch.branch_id,
          batch.ingredient_id,
          batch.batch_id,
          batch.remaining_base_quantity,
          unit_id,
          SYSTEM_USER_ID
        ]
      );

      await client.query(
        `UPDATE ingredient_batches SET is_depleted = true WHERE batch_id = $1`,
        [batch.batch_id]
      );

      loggedCount++;
      console.log(` Logged waste for ${batch.name} (expired ${batch.expiry_date})`);
    }

    await client.query('COMMIT');
    console.log(`Auto-expiry waste logging completed: ${loggedCount} batches logged`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Auto-expiry waste logging job failed:', error.message);
  } finally {
    client.release();
  }
}


function startAutoExpiryWasteLoggingJob() {
  runAutoExpiryWasteLogging().catch(err =>
    console.error('Startup waste logging failed:', err.message)
  );

  const job = cron.schedule('0 0 * * *', () => {
    runAutoExpiryWasteLogging().catch(err =>
      console.error('Midnight waste logging failed:', err.message)
    );
  }, {
    timezone: 'Asia/Colombo'
  });

  return job;
}

module.exports = { startAutoExpiryWasteLoggingJob, runAutoExpiryWasteLogging };
