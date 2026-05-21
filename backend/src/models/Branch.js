const pool = require('../config/database');

class BranchModel {
    static async getAll() {
        const query = `
            SELECT 
                branch_id as id,
                name,
                location as address,
                contact_email,
                contact_phone as contact_number,
                is_active,
                created_at,
                created_at as updated_at
            FROM branches
            WHERE is_active = true
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async getById(branchId) {
        const query = `
            SELECT 
                branch_id as id,
                name,
                location as address,
                contact_email,
                contact_phone as contact_number,
                is_active,
                created_at,
                created_at as updated_at
            FROM branches
            WHERE branch_id = $1 AND is_active = true
        `;
        const result = await pool.query(query, [branchId]);
        return result.rows[0];
    }

    static async create(branchData) {
        const { name, address, contact_email, contact_number } = branchData;
        const query = `
            INSERT INTO branches (name, location, contact_email, contact_phone, is_active)
            VALUES ($1, $2, $3, $4, true)
            RETURNING 
                branch_id as id,
                name,
                location as address,
                contact_email,
                contact_phone as contact_number,
                is_active,
                created_at,
                created_at as updated_at
        `;
        const result = await pool.query(query, [name, address, contact_email, contact_number]);
        return result.rows[0];
    }

    static async update(branchId, branchData) {
        const { name, address, contact_email, contact_number } = branchData;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }
        if (address !== undefined) {
            updates.push(`location = $${paramCount}`);
            values.push(address);
            paramCount++;
        }
        if (contact_email !== undefined) {
            updates.push(`contact_email = $${paramCount}`);
            values.push(contact_email);
            paramCount++;
        }
        if (contact_number !== undefined) {
            updates.push(`contact_phone = $${paramCount}`);
            values.push(contact_number);
            paramCount++;
        }

        if (updates.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(branchId);
        const query = `
            UPDATE branches
            SET ${updates.join(', ')}
            WHERE branch_id = $${paramCount} AND is_active = true
            RETURNING 
                branch_id as id,
                name,
                location as address,
                contact_email,
                contact_phone as contact_number,
                is_active,
                created_at,
                created_at as updated_at
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(branchId) {
        const query = `
            UPDATE branches
            SET is_active = false
            WHERE branch_id = $1
            RETURNING branch_id as id
        `;
        const result = await pool.query(query, [branchId]);
        return result.rows[0];
    }
}

module.exports = BranchModel;
