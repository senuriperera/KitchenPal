const db = require('../config/database');

class RecipeSuggestionModel {
    static async create({
        branch_id,
        notification_id,
        recipe_id,
        expiring_ingredients,
        suggested_discount_percentage,
        calculated_discounted_price,
        urgency_level,
    }) {
        const query = `
      INSERT INTO recipe_suggestions (
        branch_id, notification_id, recipe_id, expiring_ingredients,
        suggested_discount_percentage, calculated_discounted_price, urgency_level
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            branch_id,
            notification_id,
            recipe_id,
            JSON.stringify(expiring_ingredients),
            suggested_discount_percentage,
            calculated_discounted_price,
            urgency_level,
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async getAllByBranch(branch_id, status = null) {
        let query = `
      SELECT rs.*, r.name as recipe_name, r.image_url, r.cooking_time_minutes, r.base_price
      FROM recipe_suggestions rs
      JOIN recipes r ON rs.recipe_id = r.recipe_id
      WHERE rs.branch_id = $1
    `;
        const values = [branch_id];

        if (status) {
            query += ' AND rs.status = $2';
            values.push(status);
        }

        query += ' ORDER BY rs.suggested_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    static async findById(suggestion_id) {
        const query = `
      SELECT rs.*, 
        r.name as recipe_name, 
        r.image_url, 
        r.cooking_time_minutes, 
        r.base_price,
        r.description,
        u.name as approved_by_name
      FROM recipe_suggestions rs
      JOIN recipes r ON rs.recipe_id = r.recipe_id
      LEFT JOIN users u ON rs.approved_by_user_id = u.user_id
      WHERE rs.suggestion_id = $1
    `;
        const result = await db.query(query, [suggestion_id]);
        return result.rows[0];
    }

    static async approve(suggestion_id, approved_by_user_id) {
        const query = `
      UPDATE recipe_suggestions 
      SET status = 'approved', 
          approved_by_user_id = $1,
          approved_at = NOW()
      WHERE suggestion_id = $2
      RETURNING *
    `;
        const result = await db.query(query, [approved_by_user_id, suggestion_id]);
        return result.rows[0];
    }

    static async reject(suggestion_id, rejection_reason) {
        const query = `
      UPDATE recipe_suggestions 
      SET status = 'rejected',
          rejection_reason = $1
      WHERE suggestion_id = $2
      RETURNING *
    `;
        const result = await db.query(query, [rejection_reason, suggestion_id]);
        return result.rows[0];
    }

    static async updateDiscount(suggestion_id, new_discount_percentage, new_discounted_price) {
        const query = `
      UPDATE recipe_suggestions 
      SET suggested_discount_percentage = $1,
          calculated_discounted_price = $2
      WHERE suggestion_id = $3
      RETURNING *
    `;
        const result = await db.query(query, [new_discount_percentage, new_discounted_price, suggestion_id]);
        return result.rows[0];
    }

    static async delete(suggestion_id) {
        const query = 'DELETE FROM recipe_suggestions WHERE suggestion_id = $1';
        await db.query(query, [suggestion_id]);
    }
}

module.exports = RecipeSuggestionModel;
