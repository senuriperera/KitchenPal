const db = require('../config/database');

class SaleModel {
    // Create sale and deduct inventory
    static async create({
        branch_id,
        recipe_id,
        suggestion_id,
        discount_id,
        quantity_sold,
        base_price_per_unit,
        final_price_per_unit,
        total_revenue,
        recipe_type,
        sold_by_user_id,
        notes,
    }) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Create sale record
            const saleQuery = `
        INSERT INTO sales (
          branch_id, recipe_id, suggestion_id, discount_id, quantity_sold,
          base_price_per_unit, final_price_per_unit, total_revenue, recipe_type,
          sold_by_user_id, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const saleValues = [
                branch_id, recipe_id, suggestion_id, discount_id, quantity_sold,
                base_price_per_unit, final_price_per_unit, total_revenue, recipe_type,
                sold_by_user_id, notes,
            ];
            const saleResult = await client.query(saleQuery, saleValues);
            const sale = saleResult.rows[0];

            // Get recipe ingredients
            const ingredientsQuery = `
        SELECT ingredient_id, quantity_required
        FROM recipe_ingredients
        WHERE recipe_id = $1
      `;
            const ingredientsResult = await client.query(ingredientsQuery, [recipe_id]);

            // Deduct inventory for each ingredient
            for (const recipeIngredient of ingredientsResult.rows) {
                const totalQuantityNeeded = recipeIngredient.quantity_required * quantity_sold;

                const updateQuery = `
          UPDATE ingredients
          SET quantity = quantity - $1
          WHERE ingredient_id = $2 AND branch_id = $3
          RETURNING *
        `;
                const updateResult = await client.query(updateQuery, [
                    totalQuantityNeeded,
                    recipeIngredient.ingredient_id,
                    branch_id,
                ]);

                if (updateResult.rows.length === 0) {
                    throw new Error(`Ingredient ${recipeIngredient.ingredient_id} not found`);
                }

                if (updateResult.rows[0].quantity < 0) {
                    throw new Error(`Insufficient quantity for ingredient ${recipeIngredient.ingredient_id}`);
                }
            }

            // Mark inventory as deducted
            await client.query(
                'UPDATE sales SET inventory_deducted = true WHERE sale_id = $1',
                [sale.sale_id]
            );

            await client.query('COMMIT');
            return sale;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all sales by branch
    static async getAllByBranch(branch_id, filters = {}) {
        let query = `
      SELECT s.*, 
        r.name as recipe_name,
        u.name as sold_by_name
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.recipe_id
      LEFT JOIN users u ON s.sold_by_user_id = u.user_id
      WHERE s.branch_id = $1
    `;
        const values = [branch_id];
        let paramCount = 2;

        if (filters.recipe_type) {
            query += ` AND s.recipe_type = $${paramCount}`;
            values.push(filters.recipe_type);
            paramCount++;
        }

        if (filters.start_date) {
            query += ` AND s.sale_date >= $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
        }

        if (filters.end_date) {
            query += ` AND s.sale_date <= $${paramCount}`;
            values.push(filters.end_date);
            paramCount++;
        }

        query += ' ORDER BY s.sale_date DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    // Get sale by ID
    static async findById(sale_id) {
        const query = `
      SELECT s.*, 
        r.name as recipe_name,
        u.name as sold_by_name
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.recipe_id
      LEFT JOIN users u ON s.sold_by_user_id = u.user_id
      WHERE s.sale_id = $1
    `;
        const result = await db.query(query, [sale_id]);
        return result.rows[0];
    }

    // Get sales statistics
    static async getStatistics(branch_id, start_date, end_date) {
        const query = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(quantity_sold) as total_quantity,
        SUM(total_revenue) as total_revenue,
        AVG(final_price_per_unit) as avg_price,
        COUNT(CASE WHEN recipe_type = 'generated' THEN 1 END) as generated_sales,
        COUNT(CASE WHEN recipe_type = 'standard' THEN 1 END) as standard_sales
      FROM sales
      WHERE branch_id = $1
        AND sale_date >= $2
        AND sale_date <= $3
    `;
        const result = await db.query(query, [branch_id, start_date, end_date]);
        return result.rows[0];
    }

    // Delete sale
    static async delete(sale_id) {
        const query = 'DELETE FROM sales WHERE sale_id = $1';
        await db.query(query, [sale_id]);
    }
}

module.exports = SaleModel;
