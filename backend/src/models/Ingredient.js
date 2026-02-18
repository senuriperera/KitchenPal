const db = require('../config/database');

class IngredientModel {
  // Create ingredient
  static async create({ branch_id, name, quantity, unit_id, price, expiry_date, manufacture_date, storage_type_id, image_url }) {
    const query = `
      INSERT INTO ingredients (branch_id, name, quantity_in_stock, unit_id, cost_per_unit, expiry_date, manufacture_date, storage_type_id, image_url)
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
             st.code as storage_code, st.name as storage_name,
             wu.code as weight_unit_code, wu.name as weight_unit_name,
             b.name as branch_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
      LEFT JOIN units wu ON i.weight_unit_id = wu.unit_id
      LEFT JOIN branches b ON i.branch_id = b.branch_id
      WHERE i.branch_id = $1
      ORDER BY i.expiry_date ASC
    `;
    const result = await db.query(query, [branch_id]);
    return result.rows.map(row => this._mapRow(row));
  }

  // Get all ingredients across all branches (for admins)
  static async getAll() {
    const query = `
      SELECT i.*, u.code as unit_code, u.name as unit_name, 
             st.code as storage_code, st.name as storage_name,
             wu.code as weight_unit_code, wu.name as weight_unit_name,
             b.name as branch_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
      LEFT JOIN units wu ON i.weight_unit_id = wu.unit_id
      LEFT JOIN branches b ON i.branch_id = b.branch_id
      ORDER BY i.branch_id ASC, i.expiry_date ASC
    `;
    const result = await db.query(query);
    return result.rows.map(row => this._mapRow(row));
  }

  // Get ingredient by ID
  static async findById(ingredient_id) {
    const query = `
      SELECT i.*, u.code as unit_code, u.name as unit_name,
             st.code as storage_code, st.name as storage_name,
             wu.code as weight_unit_code, wu.name as weight_unit_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
      LEFT JOIN units wu ON i.weight_unit_id = wu.unit_id
      WHERE i.ingredient_id = $1
    `;
    const result = await db.query(query, [ingredient_id]);
    return this._mapRow(result.rows[0]);
  }

  // Find ingredient by name and branch
  static async findByNameAndBranch(name, branch_id) {
    const query = `
      SELECT i.*, u.code as unit_code, u.name as unit_name,
             st.code as storage_code, st.name as storage_name,
             wu.code as weight_unit_code, wu.name as weight_unit_name
      FROM ingredients i
      LEFT JOIN units u ON i.unit_id = u.unit_id
      LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
      LEFT JOIN units wu ON i.weight_unit_id = wu.unit_id
      WHERE LOWER(i.name) = LOWER($1) AND i.branch_id = $2
      LIMIT 1
    `;
    const result = await db.query(query, [name, branch_id]);
    return result.rows[0];
  }

  // Get expiring ingredients (within days)
  static async getExpiringIngredients(branch_id, days = 7) {
    let query, params;

    if (branch_id === null || branch_id === undefined) {
      // Admin: Get expiring ingredients from all branches
      query = `
        SELECT i.*, u.code as unit_code, u.name as unit_name,
               st.code as storage_code, st.name as storage_name,
               b.name as branch_name
        FROM ingredients i
        LEFT JOIN units u ON i.unit_id = u.unit_id
        LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
        LEFT JOIN branches b ON i.branch_id = b.branch_id
        WHERE i.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $1
          AND i.expiry_date >= CURRENT_DATE
          AND i.quantity_in_stock > 0
        ORDER BY i.expiry_date ASC, i.branch_id ASC
      `;
      params = [days];
    } else {
      // Regular user: Get expiring ingredients for specific branch
      query = `
        SELECT i.*, u.code as unit_code, u.name as unit_name,
               st.code as storage_code, st.name as storage_name,
               b.name as branch_name
        FROM ingredients i
        LEFT JOIN units u ON i.unit_id = u.unit_id
        LEFT JOIN storage_types st ON i.storage_type_id = st.storage_type_id
        LEFT JOIN branches b ON i.branch_id = b.branch_id
        WHERE i.branch_id = $1 
          AND i.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
          AND i.expiry_date >= CURRENT_DATE
          AND i.quantity_in_stock > 0
        ORDER BY i.expiry_date ASC
      `;
      params = [branch_id, days];
    }

    const result = await db.query(query, params);
    return result.rows.map(row => this._mapRow(row));
  }

  // Helper to map DB row to API response structure
  static _mapRow(row) {
    if (!row) return null;
    const result = { ...row };

    // Map DB field names to API field names
    result.quantity = row.quantity_in_stock;
    result.price = row.cost_per_unit;

    if (row.unit_id) {
      result.unit = {
        code: row.unit_code,
        name: row.unit_name
      };
    }

    // Handle storage type if present (getExpiringIngredients might not select it, but others do)
    if (row.storage_type_id && row.storage_code) {
      result.storageType = {
        code: row.storage_code,
        name: row.storage_name
      };
    }

    // Handle weight unit if present
    if (row.weight_unit_id && row.weight_unit_code) {
      result.weightUnit = {
        code: row.weight_unit_code,
        name: row.weight_unit_name
      };
    }

    // Clean up flat fields to keep response clean (optional but good practice)
    // NOTE: Keep quantity_in_stock and cost_per_unit for mobile app compatibility
    // delete result.quantity_in_stock;
    // delete result.cost_per_unit;
    delete result.unit_code;
    delete result.unit_name;
    delete result.storage_code;
    delete result.storage_name;
    delete result.weight_unit_code;
    delete result.weight_unit_name;

    return result;
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
