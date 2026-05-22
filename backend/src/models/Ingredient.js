const db = require('../config/database');

class IngredientModel {

  static async getAllByBranch(branch_id) {
    const query = `
            SELECT
                si.ingredient_id,
                si.name,
                si.image_url,
                MIN(ib.expiry_date) AS expiry_date,
                si.quantity_in_stock,
                si.unit_weight,
                wu.code  AS unit_weight_unit_code,
                si.total_base_quantity,
                bu.code  AS base_unit_code
            FROM stock_ingredients si
            JOIN units AS wu  ON si.unit_weight_unit_id = wu.unit_id
            LEFT JOIN units AS bu  ON si.base_unit_id   = bu.unit_id
            LEFT JOIN ingredient_batches ib ON si.ingredient_id = ib.ingredient_id
              AND ib.is_depleted = false
              AND ib.deleted_at IS NULL
            WHERE si.branch_id = $1 AND si.deleted_at IS NULL
            GROUP BY si.ingredient_id, si.name, si.image_url, si.quantity_in_stock,
                     si.unit_weight, wu.code, si.total_base_quantity, bu.code
            ORDER BY MIN(ib.expiry_date) ASC NULLS LAST
        `;
    const result = await db.query(query, [branch_id]);
    console.log(`[IngredientModel] getAllByBranch returned ${result.rows.length} ingredients for branch ${branch_id}`);
    console.log(`[IngredientModel] Ingredients: ${result.rows.map(r => r.name).join(', ')}`);
    return result.rows;
  }

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
                u.name      AS added_by_name,
                (SELECT MIN(ib.manufacture_date) 
                 FROM ingredient_batches ib 
                 WHERE ib.ingredient_id = si.ingredient_id 
                   AND ib.is_depleted = false 
                   AND ib.deleted_at IS NULL) AS manufacture_date,
                (SELECT MIN(ib.expiry_date) 
                 FROM ingredient_batches ib 
                 WHERE ib.ingredient_id = si.ingredient_id 
                   AND ib.is_depleted = false 
                   AND ib.deleted_at IS NULL) AS expiry_date
            FROM stock_ingredients si
            JOIN units          AS wu  ON si.unit_weight_unit_id = wu.unit_id
            LEFT JOIN units          AS bu  ON si.base_unit_id        = bu.unit_id
            LEFT JOIN storage_types  AS st  ON si.storage_type_id     = st.storage_type_id
            LEFT JOIN master_ingredients AS mi ON si.master_ingredient_id = mi.master_ingredient_id
            LEFT JOIN users     AS u   ON si.added_by             = u.user_id
            WHERE si.ingredient_id = $1 AND si.deleted_at IS NULL
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
              AND ib.deleted_at IS NULL
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

  static async findExistingByMasterIngredient(branch_id, master_ingredient_id) {
    const query = `
      SELECT
        si.ingredient_id,
        si.unit_weight,
        si.unit_weight_unit_id,
        si.price,
        si.storage_type_id,
        si.image_url,
        u.code AS unit_weight_unit_code,
        u.name AS unit_weight_unit_name,
        st.name AS storage_type_name
      FROM stock_ingredients si
      JOIN units u ON si.unit_weight_unit_id = u.unit_id
      JOIN storage_types st ON si.storage_type_id = st.storage_type_id
      WHERE si.branch_id = $1
      AND si.master_ingredient_id = $2
      AND si.deleted_at IS NULL
      LIMIT 1
    `;
    const result = await db.query(query, [branch_id, master_ingredient_id]);
    return result.rows[0] || null;
  }


  static async createWithTransaction(data) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const unitRow = await client.query(
        'SELECT unit_family, base_unit_code, to_base_factor FROM units WHERE unit_id = $1',
        [data.unit_weight_unit_id]
      );
      if (!unitRow.rows[0]) throw new Error('Invalid unit_weight_unit_id');

      let masterIngredientId = data.master_ingredient_id;

      if (!masterIngredientId) {
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

      const { to_base_factor, base_unit_code } = unitRow.rows[0];
      const total_base_quantity = parseFloat(data.quantity_in_stock) *
        parseFloat(data.unit_weight) *
        parseFloat(to_base_factor);

      const baseUnitRow = await client.query(
        'SELECT unit_id FROM units WHERE code = $1',
        [base_unit_code]
      );
      const base_unit_id = baseUnitRow.rows[0]?.unit_id;

      let ingredient_id;

      if (masterIngredientId) {
        const duplicateCheck = await client.query(
          `SELECT ingredient_id, total_base_quantity, quantity_in_stock, deleted_at
           FROM stock_ingredients
           WHERE branch_id = $1 AND master_ingredient_id = $2`,
          [data.branch_id, masterIngredientId]
        );

        if (duplicateCheck.rows.length > 0) {
          // Ingredient exists — UPDATE
          const existing = duplicateCheck.rows[0];
          const isDeleted = existing.deleted_at !== null;

          await client.query(
            `UPDATE stock_ingredients SET
              total_base_quantity = ${isDeleted ? '$1' : 'total_base_quantity + $1'},
              quantity_in_stock = ${isDeleted ? '$2' : 'quantity_in_stock + $2'},
              price = $3,
              unit_weight = $4,
              unit_weight_unit_id = $5,
              image_url = COALESCE($6, image_url),
              last_updated = NOW(),
              deleted_at = NULL
             WHERE ingredient_id = $7`,
            [
              total_base_quantity,
              data.quantity_in_stock,
              data.price,
              data.unit_weight,
              data.unit_weight_unit_id,
              data.image_url || null,
              existing.ingredient_id,
            ]
          );
          ingredient_id = existing.ingredient_id;
        } else {
          // Ingredient doesn't exist — INSERT
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
          ingredient_id = stockRow.rows[0].ingredient_id;
        }
      } else {
        // No master_ingredient_id — new custom ingredient — always INSERT
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
        ingredient_id = stockRow.rows[0].ingredient_id;
      }

      console.log(`[IngredientModel] Inserted ingredient_id: ${ingredient_id}, creating batch...`);

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
      if (data.expiry_date) {
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
      }

      // Step 6 — Commit
      await client.query('COMMIT');
      console.log(`[IngredientModel] Transaction committed for ingredient_id: ${ingredient_id}`);

      // Return full detail
      return this.findByIdDetailed(ingredient_id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Delete ingredient (soft delete) ───────────────────────────────────────
  static async delete(ingredient_id) {
    // Soft delete: mark ingredient and its batches as deleted instead of removing them
    // This preserves referential integrity and sales history
    await db.query(
      'UPDATE stock_ingredients SET deleted_at = NOW() WHERE ingredient_id = $1',
      [ingredient_id]
    );
    await db.query(
      'UPDATE ingredient_batches SET deleted_at = NOW() WHERE ingredient_id = $1',
      [ingredient_id]
    );
  }

  // ─── Get expiring ingredients for a branch ─────────────────────────────────
  static async getExpiringIngredients(branch_id, days = 7) {
    const query = `
            SELECT
                si.ingredient_id,
                si.name,
                si.image_url,
                si.quantity_in_stock,
                si.unit_weight,
                wu.code AS unit_weight_unit_code,
                wu.unit_family,
                si.total_base_quantity,
                bu.code AS base_unit_code,
                si.storage_type_id,
                st.name AS storage_type_name,
                si.master_ingredient_id,
                si.added_by,
                si.manufacture_date,
                si.price,
                si.unit_weight_unit_id,
                si.base_unit_id,
                MIN(ib.expiry_date) AS expiry_date
            FROM stock_ingredients si
            JOIN ingredient_batches ib ON si.ingredient_id = ib.ingredient_id
            JOIN units AS wu ON si.unit_weight_unit_id = wu.unit_id
            LEFT JOIN units AS bu ON si.base_unit_id   = bu.unit_id
            LEFT JOIN storage_types AS st ON si.storage_type_id = st.storage_type_id
            WHERE si.branch_id = $1
              AND ib.is_depleted = false
              AND ib.expiry_date <= CURRENT_DATE + ($2 || ' days')::INTERVAL
              AND ib.expiry_date >= CURRENT_DATE
              AND si.deleted_at IS NULL
            GROUP BY si.ingredient_id, si.name, si.image_url, si.quantity_in_stock, 
                     si.unit_weight, wu.code, wu.unit_family, si.total_base_quantity, 
                     bu.code, si.storage_type_id, st.name, si.master_ingredient_id, 
                     si.added_by, si.manufacture_date, si.price, si.unit_weight_unit_id, 
                     si.base_unit_id
            ORDER BY expiry_date ASC
        `;
    const result = await db.query(query, [branch_id, days]);
    return result.rows;
  }
}

module.exports = IngredientModel;
