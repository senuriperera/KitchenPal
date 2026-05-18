const db = require('../config/database');

class MasterIngredientModel {
    /**
     * Search master ingredients by name (case-insensitive, partial match)
     */
    static async search(searchTerm, limit = 20) {
        const query = `
      SELECT mi.*,
             mi.unit_family,
             mi.base_unit_id,
             mi.default_unit_id,
             u.code as unit_code,
             u.name as unit_name
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
    static async create({ name, default_unit_id = null, unit_family = null, base_unit_id = null, is_custom = false }) {
        const query = `
      INSERT INTO master_ingredients (name, default_unit_id, unit_family, base_unit_id, is_custom)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const result = await db.query(query, [name, default_unit_id, unit_family, base_unit_id, is_custom]);
        return this._mapRow(result.rows[0]);
    }


    // Derive unit_family and base_unit_id from a unit_id.

    static async deriveUnitFamilyFields(unitId) {
        // get unit_family and base_unit_code from the selected unit
        const unitQuery = `
      SELECT unit_family, base_unit_code
      FROM units
      WHERE unit_id = $1
    `;
        const unitResult = await db.query(unitQuery, [unitId]);
        if (!unitResult.rows[0]) return null;

        const { unit_family, base_unit_code } = unitResult.rows[0];

        // look up base_unit_id from the code
        const baseQuery = `
      SELECT unit_id
      FROM units
      WHERE code = $1
    `;
        const baseResult = await db.query(baseQuery, [base_unit_code]);
        const base_unit_id = baseResult.rows[0]?.unit_id || null;

        return { unit_family, base_unit_id };
    }

    /**
     * Find or create a master ingredient by name
     * If exists, return it.
     */
    static async findOrCreate({ name, default_unit_id = null, unit_id = null }) {
        // First try to find existing
        const existing = await this.findByName(name);
        if (existing) {
            return { ingredient: existing, created: false };
        }

        // Derive unit_family and base_unit_id from the selected unit (Change 2)
        let unit_family = null;
        let base_unit_id = null;
        if (unit_id) {
            const derived = await this.deriveUnitFamilyFields(unit_id);
            if (derived) {
                unit_family = derived.unit_family;
                base_unit_id = derived.base_unit_id;
            }
        }

        // Create new custom ingredient with derived fields
        const created = await this.create({
            name,
            default_unit_id: default_unit_id || unit_id,
            unit_family,
            base_unit_id,
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
            unit_family: row.unit_family || null,
            base_unit_id: row.base_unit_id || null,
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
