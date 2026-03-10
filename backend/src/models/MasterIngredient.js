const db = require('../config/database');

class MasterIngredientModel {
    /**
     * Search master ingredients by name (case-insensitive, partial match)
     */
    static async search(searchTerm, limit = 20) {
        const query = `
      SELECT mi.*, u.code as unit_code, u.name as unit_name
      FROM master_ingredients mi
      LEFT JOIN units u ON mi.default_unit_id = u.unit_id
      WHERE LOWER(mi.name) LIKE LOWER($1)
      ORDER BY 
        CASE WHEN LOWER(mi.name) = LOWER($2) THEN 0 ELSE 1 END,
        mi.name ASC
      LIMIT $3
    `;
        const result = await db.query(query, [`%${searchTerm}%`, searchTerm, limit]);
        return result.rows.map(row => this._mapRow(row));
    }

    /**
     * Get all master ingredients
     */
    static async getAll() {
        const query = `
      SELECT mi.*, u.code as unit_code, u.name as unit_name
      FROM master_ingredients mi
      LEFT JOIN units u ON mi.default_unit_id = u.unit_id
      ORDER BY mi.name ASC
    `;
        const result = await db.query(query);
        return result.rows.map(row => this._mapRow(row));
    }

    /**
     * Get master ingredient by ID
     */
    static async findById(masterIngredientId) {
        const query = `
      SELECT mi.*, u.code as unit_code, u.name as unit_name
      FROM master_ingredients mi
      LEFT JOIN units u ON mi.default_unit_id = u.unit_id
      WHERE mi.master_ingredient_id = $1
    `;
        const result = await db.query(query, [masterIngredientId]);
        return result.rows[0] ? this._mapRow(result.rows[0]) : null;
    }

    /**
     * Find master ingredient by exact name (case-insensitive)
     */
    static async findByName(name) {
        const query = `
      SELECT mi.*, u.code as unit_code, u.name as unit_name
      FROM master_ingredients mi
      LEFT JOIN units u ON mi.default_unit_id = u.unit_id
      WHERE LOWER(mi.name) = LOWER($1)
    `;
        const result = await db.query(query, [name]);
        return result.rows[0] ? this._mapRow(result.rows[0]) : null;
    }

    /**
     * Create a new master ingredient
     */
    static async create({ name, default_unit_id = null, is_custom = false }) {
        const query = `
      INSERT INTO master_ingredients (name, default_unit_id, is_custom)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const result = await db.query(query, [name, default_unit_id, is_custom]);
        return this._mapRow(result.rows[0]);
    }

    /**
     * Find or create a master ingredient by name
     * If exists, return it. If not, create with is_custom = true
     */
    static async findOrCreate({ name, default_unit_id = null }) {
        // First try to find existing
        const existing = await this.findByName(name);
        if (existing) {
            return { ingredient: existing, created: false };
        }

        // Create new custom ingredient
        const created = await this.create({
            name,
            default_unit_id,
            is_custom: true
        });
        return { ingredient: created, created: true };
    }

    /**
     * Update a master ingredient
     */
    static async update(masterIngredientId, { name, default_unit_id }) {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (default_unit_id !== undefined) {
            updates.push(`default_unit_id = $${paramCount++}`);
            values.push(default_unit_id);
        }

        if (updates.length === 0) {
            return this.findById(masterIngredientId);
        }

        values.push(masterIngredientId);
        const query = `
      UPDATE master_ingredients 
      SET ${updates.join(', ')}
      WHERE master_ingredient_id = $${paramCount}
      RETURNING *
    `;
        const result = await db.query(query, values);
        return result.rows[0] ? this._mapRow(result.rows[0]) : null;
    }

    /**
     * Delete a master ingredient
     */
    static async delete(masterIngredientId) {
        const query = `DELETE FROM master_ingredients WHERE master_ingredient_id = $1`;
        await db.query(query, [masterIngredientId]);
    }

    /**
     * Map DB row to API response structure
     */
    static _mapRow(row) {
        if (!row) return null;
        return {
            master_ingredient_id: row.master_ingredient_id,
            name: row.name,
            unit_family: row.unit_family,
            default_unit_id: row.default_unit_id,
            is_custom: row.is_custom,
            created_at: row.created_at,
            defaultUnit: row.unit_code ? {
                code: row.unit_code,
                name: row.unit_name
            } : null
        };
    }
}

module.exports = MasterIngredientModel;
