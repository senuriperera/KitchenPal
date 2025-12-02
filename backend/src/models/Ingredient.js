const db = require('../config/database');

class IngredientModel {
    // Create ingredient
    static async create({ branch_id, name, quantity, unit_id, price, expiry_date, manufacture_date, storage_type_id, image_url }) {
        const query = `
      INSERT INTO ingredients (branch_id, name, quantity, unit_id, price, expiry_date, manufacture_date, storage_type_id, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
        const values = [branch_id, name, quantity, unit_id, price, expiry_date, manufacture_date, storage_type_id, image_url];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Get all ingredients for a branch
    static async getAllByBranch(branch_id) {
        const query = `
      SELECT i.*, u.code as unit_code, u.name as unit_name, 
             st.code as storage_code, st.name as storage_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
      WHERE i.branch_id = $1
      ORDER BY i.expiry_date ASC
    `;
        const result = await db.query(query, [branch_id]);
        return result.rows;
    }

    // Get ingredient by ID
    static async findById(ingredient_id) {
        const query = `
      SELECT i.*, u.code as unit_code, u.name as unit_name,
             st.code as storage_code, st.name as storage_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
      WHERE i.ingredient_id = $1
    `;
        const result = await db.query(query, [ingredient_id]);
        return result.rows[0];
    }

    // Get expiring ingredients (within days)
    static async getExpiringIngredients(branch_id, days = 7) {
        const query = `
      SELECT i.*, u.code as unit_code, u.name as unit_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      WHERE i.branch_id = $1 
        AND i.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
        AND i.expiry_date >= CURRENT_DATE
        AND i.quantity > 0
      ORDER BY i.expiry_date ASC
    `;
        const result = await db.query(query, [branch_id, days]);
        return result.rows;
    }

    // Update ingredient
    static async update(ingredient_id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach((key) => {
            if (updates[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        });

        if (fields.length === 0) return null;

        values.push(ingredient_id);
        const query = `
      UPDATE ingredients 
      SET ${fields.join(', ')}
      WHERE ingredient_id = $${paramCount}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Update ingredient quantity (for inventory deduction)
    static async updateQuantity(ingredient_id, quantity_change) {
        const query = `
      UPDATE ingredients 
      SET quantity = quantity + $1
      WHERE ingredient_id = $2
      RETURNING *
    `;
        const result = await db.query(query, [quantity_change, ingredient_id]);
        return result.rows[0];
    }

    // Delete ingredient
    static async delete(ingredient_id) {
        const query = 'DELETE FROM ingredients WHERE ingredient_id = $1';
        await db.query(query, [ingredient_id]);
    }

    // Get monthly waste and saved statistics
    static async getMonthlyStats(branch_id, year, month) {
        const query = `
      WITH monthly_sales AS (
        SELECT 
          COALESCE(SUM(CASE WHEN recipe_type = 'generated' THEN quantity_sold ELSE 0 END), 0) as saved_items,
          COALESCE(SUM(CASE WHEN recipe_type = 'standard' THEN quantity_sold ELSE 0 END), 0) as standard_items
        FROM sales
        WHERE branch_id = $1
          AND EXTRACT(YEAR FROM sale_date) = $2
          AND EXTRACT(MONTH FROM sale_date) = $3
      ),
      expired_items AS (
        SELECT COUNT(*) as wasted_items
        FROM ingredients
        WHERE branch_id = $1
          AND expiry_date < CURRENT_DATE
          AND quantity > 0
      )
      SELECT 
        ms.saved_items,
        ms.standard_items,
        ei.wasted_items,
        (ms.saved_items + ei.wasted_items) as total_expiring
      FROM monthly_sales ms, expired_items ei
    `;
        const result = await db.query(query, [branch_id, year, month]);
        return result.rows[0];
    }
}

module.exports = IngredientModel;
