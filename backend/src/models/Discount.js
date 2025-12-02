const db = require('../config/database');

class DiscountModel {
    // Create discount
    static async create({
        suggestion_id,
        branch_id,
        original_price,
        suggested_discount_percentage,
        admin_approved_discount_percentage,
        final_discounted_price,
        approved_by_admin_id,
    }) {
        const query = `
      INSERT INTO discounts (
        suggestion_id, branch_id, original_price, suggested_discount_percentage,
        admin_approved_discount_percentage, final_discounted_price, approved_by_admin_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        const status = approved_by_admin_id ? 'approved' : 'pending';
        const values = [
            suggestion_id,
            branch_id,
            original_price,
            suggested_discount_percentage,
            admin_approved_discount_percentage,
            final_discounted_price,
            approved_by_admin_id,
            status,
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Get all discounts by branch
    static async getAllByBranch(branch_id, status = null) {
        let query = `
      SELECT d.*, 
        rs.recipe_id,
        r.name as recipe_name,
        u.name as approved_by_name
      FROM discounts d
      LEFT JOIN recipe_suggestions rs ON d.suggestion_id = rs.suggestion_id
      LEFT JOIN recipes r ON rs.recipe_id = r.recipe_id
      LEFT JOIN users u ON d.approved_by_admin_id = u.user_id
      WHERE d.branch_id = $1
    `;
        const values = [branch_id];

        if (status) {
            query += ' AND d.status = $2';
            values.push(status);
        }

        query += ' ORDER BY d.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    // Get discount by ID
    static async findById(discount_id) {
        const query = `
      SELECT d.*, 
        rs.recipe_id,
        r.name as recipe_name,
        u.name as approved_by_name
      FROM discounts d
      LEFT JOIN recipe_suggestions rs ON d.suggestion_id = rs.suggestion_id
      LEFT JOIN recipes r ON rs.recipe_id = r.recipe_id
      LEFT JOIN users u ON d.approved_by_admin_id = u.user_id
      WHERE d.discount_id = $1
    `;
        const result = await db.query(query, [discount_id]);
        return result.rows[0];
    }

    // Approve discount
    static async approve(discount_id, approved_by_admin_id, admin_approved_discount_percentage, final_discounted_price, admin_notes = null) {
        const query = `
      UPDATE discounts 
      SET status = 'approved',
          approved_by_admin_id = $1,
          admin_approved_discount_percentage = $2,
          final_discounted_price = $3,
          admin_notes = $4,
          approved_at = NOW()
      WHERE discount_id = $5
      RETURNING *
    `;
        const result = await db.query(query, [
            approved_by_admin_id,
            admin_approved_discount_percentage,
            final_discounted_price,
            admin_notes,
            discount_id,
        ]);
        return result.rows[0];
    }

    // Reject discount
    static async reject(discount_id, admin_notes) {
        const query = `
      UPDATE discounts 
      SET status = 'rejected',
          admin_notes = $1
      WHERE discount_id = $2
      RETURNING *
    `;
        const result = await db.query(query, [admin_notes, discount_id]);
        return result.rows[0];
    }

    // Delete discount
    static async delete(discount_id) {
        const query = 'DELETE FROM discounts WHERE discount_id = $1';
        await db.query(query, [discount_id]);
    }
}

module.exports = DiscountModel;
