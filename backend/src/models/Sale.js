const db = require('../config/database');

class SaleModel {
    // Create sale and deduct inventory with proper FIFO logic
    static async create({
        branch_id,
        recipe_id,
        generated_id,
        quantity_sold,
        sold_by,
    }) {
        console.log('[SaleModel.create] START');
        console.log('[SaleModel.create] branch_id:', branch_id);
        console.log('[SaleModel.create] recipe_id:', recipe_id);
        console.log('[SaleModel.create] generated_id:', generated_id);
        console.log('[SaleModel.create] quantity_sold:', quantity_sold);
        console.log('[SaleModel.create] sold_by:', sold_by);

        const client = await db.getClient();

        try {
            console.log('[SaleModel.create] Starting transaction...');
            await client.query('BEGIN');


            // Fetch recipe details and total_servings

            console.log('[SaleModel.create] STEP 1: Fetching recipe details...');
            const recipeResult = await client.query(
                `SELECT recipe_id, name, base_price, total_servings, is_active
                 FROM recipes
                 WHERE recipe_id = $1`,
                [recipe_id]
            );

            if (recipeResult.rows.length === 0) {
                console.log('[SaleModel.create] Recipe not found!');
                throw new Error('Recipe not found');
            }

            const recipe = recipeResult.rows[0];
            console.log('[SaleModel.create] Recipe found:', recipe);

            if (!recipe.is_active) {
                console.log('[SaleModel.create] Recipe is not active');
                throw new Error('Recipe is not active');
            }

            const totalServings = recipe.total_servings || 1;
            let basePrice = parseFloat(recipe.base_price);
            
            // If this is a sale from a generated recipe, use the discounted price
            if (generated_id) {
                const generatedResult = await client.query(
                    `SELECT final_discount_price FROM generated_recipes WHERE generated_id = $1 AND status = 'approved'`,
                    [generated_id]
                );
                if (generatedResult.rows.length > 0 && generatedResult.rows[0].final_discount_price != null) {
                    basePrice = parseFloat(generatedResult.rows[0].final_discount_price);
                }
            }
            
            console.log('[SaleModel.create] totalServings:', totalServings);
            console.log('[SaleModel.create] basePrice:', basePrice);


            // Fetch all recipe ingredients with unit conversion

            console.log('[SaleModel.create] STEP 2: Fetching recipe ingredients...');
            const ingredientsResult = await client.query(
                `SELECT
                    ri.master_ingredient_id,
                    ri.quantity_required,
                    ri.is_optional,
                    u.to_base_factor,
                    mi.name AS ingredient_name
                 FROM recipe_ingredients ri
                 JOIN units u ON ri.unit_id = u.unit_id
                 JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
                 WHERE ri.recipe_id = $1`,
                [recipe_id]
            );

            console.log('[SaleModel.create] Found', ingredientsResult.rows.length, 'ingredients');

            if (ingredientsResult.rows.length === 0) {
                console.log('[SaleModel.create] Recipe has no ingredients!');
                throw new Error('Recipe has no ingredients defined');
            }

            // Calculate base quantity needed per ingredient
            const servingFraction = quantity_sold / totalServings;
            const ingredientsToDeduct = ingredientsResult.rows.map((ing) => ({
                master_ingredient_id: ing.master_ingredient_id,
                ingredient_name: ing.ingredient_name,
                is_optional: ing.is_optional,
                base_qty_needed:
                    parseFloat(ing.quantity_required) *
                    parseFloat(ing.to_base_factor) *
                    servingFraction,
            }));


            // Stock check with FOR UPDATE lock (collect all failures)

            const insufficientIngredients = [];

            for (const ing of ingredientsToDeduct) {
                if (ing.is_optional) continue; // Skip optional ingredients

                const stockResult = await client.query(
                    `SELECT si.ingredient_id, si.total_base_quantity
                     FROM stock_ingredients si
                     WHERE si.master_ingredient_id = $1
                       AND si.branch_id = $2
                     FOR UPDATE`,
                    [ing.master_ingredient_id, branch_id]
                );

                if (stockResult.rows.length === 0) {
                    insufficientIngredients.push({
                        ingredient: ing.ingredient_name,
                        required: ing.base_qty_needed,
                        available: 0,
                    });
                } else {
                    const stock = stockResult.rows[0];
                    const availableQty = parseFloat(stock.total_base_quantity);

                    if (availableQty < ing.base_qty_needed) {
                        insufficientIngredients.push({
                            ingredient: ing.ingredient_name,
                            required: ing.base_qty_needed,
                            available: availableQty,
                        });
                    }

                    // Store ingredient_id for deduction step
                    ing.ingredient_id = stock.ingredient_id;
                }
            }

            // If any ingredient is insufficient, rollback and throw error
            if (insufficientIngredients.length > 0) {
                console.log('[SaleModel.create] Insufficient stock detected!');
                console.log('[SaleModel.create] Details:', JSON.stringify(insufficientIngredients, null, 2));
                await client.query('ROLLBACK');
                const err = new Error('Insufficient stock');
                err.code = 'INSUFFICIENT_STOCK';
                err.details = insufficientIngredients;
                throw err;
            }

            console.log('[SaleModel.create] All ingredients have sufficient stock!');


            // Insert into sales table

            console.log('[SaleModel.create] Inserting into sales table...');
            const totalRevenue = basePrice * quantity_sold;
            console.log('[SaleModel.create] totalRevenue:', totalRevenue);

            const saleResult = await client.query(
                `INSERT INTO sales (
                    branch_id, recipe_id, generated_id,
                    quantity_sold, base_price_per_unit, total_revenue,
                    sold_by, sold_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                 RETURNING sale_id, sold_at`,
                [branch_id, recipe_id, generated_id, quantity_sold, basePrice, totalRevenue, sold_by]
            );

            const saleId = saleResult.rows[0].sale_id;
            const soldAt = saleResult.rows[0].sold_at;
            console.log('[SaleModel.create] Sale created! saleId:', saleId, 'soldAt:', soldAt);


            // FIFO deduction for each ingredient + Update stock_ingredients

            console.log('[SaleModel.create] Starting FIFO deduction...');
            for (const ing of ingredientsToDeduct) {
                if (ing.is_optional || !ing.ingredient_id) {
                    console.log('[SaleModel.create] Skipping optional or missing ingredient:', ing.ingredient_name);
                    continue;
                }

                console.log('[SaleModel.create] Deducting ingredient:', ing.ingredient_name);
                console.log('[SaleModel.create] Amount needed:', ing.base_qty_needed);

                // Query batches oldest expiry first with FOR UPDATE lock
                // Only include non-expired batches
                const batchesResult = await client.query(
                    `SELECT batch_id, remaining_base_quantity
                     FROM ingredient_batches
                     WHERE ingredient_id = $1
                       AND is_depleted = false
                       AND expiry_date > NOW()::DATE
                       AND deleted_at IS NULL
                     ORDER BY expiry_date ASC
                     FOR UPDATE`,
                    [ing.ingredient_id]
                );

                console.log('[SaleModel.create] Found', batchesResult.rows.length, 'batches');

                let remainingToDeduct = ing.base_qty_needed;

                // Loop through batches and deduct
                for (const batch of batchesResult.rows) {
                    if (remainingToDeduct <= 0) break;

                    const deductFromBatch = Math.min(
                        parseFloat(batch.remaining_base_quantity),
                        remainingToDeduct
                    );
                    const newRemaining = parseFloat(batch.remaining_base_quantity) - deductFromBatch;
                    const isDepleted = newRemaining <= 0;

                    console.log('[SaleModel.create] Batch', batch.batch_id, '- deducting', deductFromBatch, '(remaining:', newRemaining, 'depleted:', isDepleted, ')');

                    // Update batch
                    await client.query(
                        `UPDATE ingredient_batches SET
                            remaining_base_quantity = $1,
                            is_depleted = $2
                         WHERE batch_id = $3`,
                        [newRemaining, isDepleted, batch.batch_id]
                    );

                    // Record deduction in sale_deductions
                    await client.query(
                        `INSERT INTO sale_deductions (sale_id, batch_id, quantity_deducted)
                         VALUES ($1, $2, $3)`,
                        [saleId, batch.batch_id, deductFromBatch]
                    );

                    remainingToDeduct -= deductFromBatch;
                }

                console.log('[SaleModel.create] Updating stock_ingredients for', ing.ingredient_name);

                // Update stock_ingredients after all batch deductions
                // Only count non-expired, non-depleted batches
                await client.query(
                    `UPDATE stock_ingredients SET
                        total_base_quantity = total_base_quantity - $1,
                        quantity_in_stock = (
                            SELECT COALESCE(SUM(remaining_quantity), 0)
                            FROM ingredient_batches
                            WHERE ingredient_id = $2
                              AND is_depleted = false
                              AND expiry_date > NOW()::DATE
                              AND deleted_at IS NULL
                        ),
                        last_updated = NOW()
                     WHERE ingredient_id = $3`,
                    [ing.base_qty_needed, ing.ingredient_id, ing.ingredient_id]
                );
            }

            // ─────────────────────────────────────────────────────────
            // STEP 7: Commit and return
            // ─────────────────────────────────────────────────────────
            console.log('[SaleModel.create] STEP 7: Committing transaction...');
            await client.query('COMMIT');
            console.log('[SaleModel.create] Transaction committed successfully!');

            const result = {
                sale_id: saleId,
                recipe_name: recipe.name,
                quantity_sold: quantity_sold,
                total_revenue: totalRevenue,
                sold_at: soldAt,
            };
            console.log('[SaleModel.create] Returning:', result);
            console.log('[SaleModel.create] END - SUCCESS');
            return result;
        } catch (error) {
            console.log('[SaleModel.create] ERROR CAUGHT!');
            console.log('[SaleModel.create] Error message:', error.message);
            console.log('[SaleModel.create] Error code:', error.code);
            console.log('[SaleModel.create] Stack trace:', error.stack);
            console.log('[SaleModel.create] Rolling back transaction...');
            await client.query('ROLLBACK');
            console.log('[SaleModel.create] Rollback complete, rethrowing error');
            throw error;
        } finally {
            console.log('[SaleModel.create] Releasing client connection');
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
      LEFT JOIN users u ON s.sold_by = u.user_id
      WHERE s.branch_id = $1
    `;
        const values = [branch_id];
        let paramCount = 2;

        if (filters.start_date) {
            query += ` AND s.sold_at >= $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
        }

        if (filters.end_date) {
            query += ` AND s.sold_at <= $${paramCount}`;
            values.push(filters.end_date);
            paramCount++;
        }

        query += ' ORDER BY s.sold_at DESC';

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
      LEFT JOIN users u ON s.sold_by = u.user_id
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
        AVG(base_price_per_unit) as avg_price,
        COUNT(CASE WHEN generated_id IS NOT NULL THEN 1 END) as generated_sales,
        COUNT(CASE WHEN generated_id IS NULL THEN 1 END) as standard_sales
      FROM sales
      WHERE branch_id = $1
        AND sold_at >= $2
        AND sold_at <= $3
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
