const db = require('../config/database');

class IngredientModel {

  // ─── Get all stock ingredients for a branch (inventory list view) ──────────
  static async getAllByBranch(branch_id) {
    const query = `
            SELECT
                si.ingredient_id,
                si.name,
                si.image_url,
                si.expiry_date,
                si.quantity_in_stock,
                si.unit_weight,
                wu.code  AS unit_weight_unit_code,
                si.total_base_quantity,
                bu.code  AS base_unit_code
            FROM stock_ingredients si
            JOIN units AS wu  ON si.unit_weight_unit_id = wu.unit_id
            LEFT JOIN units AS bu  ON si.base_unit_id   = bu.unit_id
            WHERE si.branch_id = $1
            ORDER BY si.expiry_date ASC
        `;
    const result = await db.query(query, [branch_id]);
    return result.rows;
  }

  // ─── Get detailed ingredient by ID (detail page) ───────────────────────────
  static async findByIdDetailed(ingredient_id) {
    const ingredientQuery = `
            SELECT
                si.ingredient_id,
                si.name,
                si.image_url,
                si.quantity_in_stock,
                si.unit_weight,
                si.total_base_quantity,
                si.price,
                si.manufacture_date,
                si.expiry_date,
                si.added_at,
                wu.unit_id  AS unit_weight_unit_id,
                wu.code     AS unit_weight_unit_code,
                wu.name     AS unit_weight_unit_name,
                bu.unit_id  AS base_unit_id,
                bu.code     AS base_unit_code,
                st.storage_type_id,
                st.name     AS storage_type_name,
                mi.master_ingredient_id,
                mi.unit_family,
                u.user_id   AS added_by_id,
                u.name      AS added_by_name
            FROM stock_ingredients si
            JOIN units          AS wu  ON si.unit_weight_unit_id = wu.unit_id
            LEFT JOIN units          AS bu  ON si.base_unit_id        = bu.unit_id
            LEFT JOIN storage_types  AS st  ON si.storage_type_id     = st.storage_type_id
            LEFT JOIN master_ingredients AS mi ON si.master_ingredient_id = mi.master_ingredient_id
            LEFT JOIN users     AS u   ON si.added_by             = u.user_id
            WHERE si.ingredient_id = $1
        `;

    const batchesQuery = `
            SELECT
                ib.batch_id,
                ib.remaining_base_quantity,
                bu.code AS base_unit_code,
                ib.expiry_date,
                ib.is_depleted
            FROM ingredient_batches ib
            LEFT JOIN units AS bu ON ib.base_unit_id = bu.unit_id
            WHERE ib.ingredient_id = $1
              AND ib.is_depleted = false
            ORDER BY ib.expiry_date ASC
        `;

    const [ingredientResult, batchesResult] = await Promise.all([
      db.query(ingredientQuery, [ingredient_id]),
      db.query(batchesQuery, [ingredient_id]),
    ]);

    if (!ingredientResult.rows[0]) return null;

    return {
      ...ingredientResult.rows[0],
      batches: batchesResult.rows,
    };
  }

  // ─── Create ingredient (full 6-step transaction) ───────────────────────────
  /**
   * @param {Object} data
   * @param {number|null}  data.master_ingredient_id   null → create new master row
   * @param {string}       data.name
   * @param {number}       data.quantity_in_stock
   * @param {number}       data.unit_weight
   * @param {number}       data.unit_weight_unit_id
   * @param {number}       data.price
   * @param {number}       data.storage_type_id
   * @param {string}       data.manufacture_date       ISO string or null
   * @param {string}       data.expiry_date            ISO string
   * @param {string|null}  data.image_url
   * @param {number}       data.added_by               user_id from JWT
   * @param {number}       data.branch_id              branch_id from JWT
   * @returns {Object}  The full created ingredient (same shape as findByIdDetailed)
   */
  static async createWithTransaction(data) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Step 1 — Resolve master_ingredient_id (create custom if new)
      let masterIngredientId = data.master_ingredient_id;

      if (!masterIngredientId) {
        // Infer unit_family from selected unit
        const unitRow = await client.query(
          'SELECT unit_family, base_unit_code FROM units WHERE unit_id = $1',
          [data.unit_weight_unit_id]
        );
        if (!unitRow.rows[0]) throw new Error('Invalid unit_weight_unit_id');

        const { unit_family, base_unit_code } = unitRow.rows[0];

        const baseUnitRow = await client.query(
          'SELECT unit_id FROM units WHERE code = $1',
          [base_unit_code]
        );
        const base_unit_id = baseUnitRow.rows[0]?.unit_id;

        const masterRow = await client.query(
          `INSERT INTO master_ingredients (name, unit_family, base_unit_id, default_unit_id, is_custom)
                     VALUES ($1, $2, $3, $4, true)
                     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                     RETURNING master_ingredient_id`,
          [data.name, unit_family, base_unit_id, data.unit_weight_unit_id]
        );
        masterIngredientId = masterRow.rows[0].master_ingredient_id;
      }

      // Step 2 — Compute total_base_quantity
      const unitRow = await client.query(
        'SELECT to_base_factor, base_unit_code FROM units WHERE unit_id = $1',
        [data.unit_weight_unit_id]
      );
      if (!unitRow.rows[0]) throw new Error('Invalid unit_weight_unit_id');

      const { to_base_factor, base_unit_code } = unitRow.rows[0];
      const total_base_quantity = parseFloat(data.quantity_in_stock) *
        parseFloat(data.unit_weight) *
        parseFloat(to_base_factor);

      const baseUnitRow = await client.query(
        'SELECT unit_id FROM units WHERE code = $1',
        [base_unit_code]
      );
      const base_unit_id = baseUnitRow.rows[0]?.unit_id;

      // Step 3 — Insert into stock_ingredients
      const stockRow = await client.query(
        `INSERT INTO stock_ingredients
                    (branch_id, master_ingredient_id, name, quantity_in_stock,
                     unit_weight, unit_weight_unit_id, total_base_quantity, base_unit_id,
                     price, storage_type_id, manufacture_date, expiry_date,
                     image_url, added_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                 RETURNING ingredient_id`,
        [
          data.branch_id, masterIngredientId, data.name,
          data.quantity_in_stock, data.unit_weight, data.unit_weight_unit_id,
          total_base_quantity, base_unit_id,
          data.price, data.storage_type_id,
          data.manufacture_date || null,
          data.expiry_date,
          data.image_url || null,
          data.added_by,
        ]
      );
      const ingredient_id = stockRow.rows[0].ingredient_id;

      // Step 4 — Insert into ingredient_batches
      await client.query(
        `INSERT INTO ingredient_batches
                    (ingredient_id, quantity, remaining_quantity,
                     unit_weight, unit_weight_unit_id,
                     remaining_base_quantity, base_unit_id,
                     manufacture_date, expiry_date, is_depleted)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)`,
        [
          ingredient_id,
          data.quantity_in_stock, data.quantity_in_stock,
          data.unit_weight, data.unit_weight_unit_id,
          total_base_quantity, base_unit_id,
          data.manufacture_date || null,
          data.expiry_date,
        ]
      );

      // Step 5 — Expiry notification if within 3 days
      const expiryDate = new Date(data.expiry_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 3) {
        await client.query(
          `INSERT INTO notifications
                        (user_id, branch_id, ingredient_id, title, message,
                         notification_type, status, days_until_expiry, is_read)
                     VALUES ($1,$2,$3,$4,$5,'expiry_alert','unread',$6,false)`,
          [
            data.added_by,
            data.branch_id,
            ingredient_id,
            `Expiry Alert: ${data.name}`,
            `${data.name} expires in ${daysUntilExpiry} day(s).`,
            daysUntilExpiry,
          ]
        );
      }

      // Step 6 — Commit
      await client.query('COMMIT');

      // Return full detail
      return this.findByIdDetailed(ingredient_id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Delete ingredient ─────────────────────────────────────────────────────
  static async delete(ingredient_id) {
    await db.query('DELETE FROM stock_ingredients WHERE ingredient_id = $1', [ingredient_id]);
  }

  // ─── Get expiring ingredients for a branch ─────────────────────────────────
  static async getExpiringIngredients(branch_id, days = 7) {
    const query = `
            SELECT
                si.ingredient_id,
                si.name,
                si.image_url,
                si.expiry_date,
                si.quantity_in_stock,
                si.unit_weight,
                wu.code AS unit_weight_unit_code,
                si.total_base_quantity,
                bu.code AS base_unit_code
            FROM stock_ingredients si
            JOIN units AS wu ON si.unit_weight_unit_id = wu.unit_id
            LEFT JOIN units AS bu ON si.base_unit_id   = bu.unit_id
            WHERE si.branch_id = $1
              AND si.expiry_date <= CURRENT_DATE + ($2 || ' days')::INTERVAL
              AND si.expiry_date >= CURRENT_DATE
            ORDER BY si.expiry_date ASC
        `;
    const result = await db.query(query, [branch_id, days]);
    return result.rows;
  }
}

module.exports = IngredientModel;
