const { Pool } = require('pg');
const config = require('./src/config/config');

const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
});

async function cleanupSeedData() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🗑️  Cleaning up seed data...');

        // Find all test ingredients by name pattern
        const testIngredients = [
            'Expired Milk',
            'Expired Butter',
            'Expired Yogurt',
            'Nearing - Cheese',
            'Nearing - Cream',
            'Efficient - Chicken Breast',
            'Efficient - Olive Oil',
        ];

        for (const ingredientName of testIngredients) {
            // Find the ingredient
            const ingRes = await client.query(
                `SELECT ingredient_id FROM stock_ingredients WHERE name = $1`,
                [ingredientName]
            );

            if (ingRes.rows.length === 0) {
                console.log(`⏭️  ${ingredientName} not found, skipping`);
                continue;
            }

            const ingredientId = ingRes.rows[0].ingredient_id;

            // Delete related records in order (due to foreign keys)
            // 1. Delete sale deductions
            await client.query(
                `DELETE FROM sale_deductions
                 WHERE batch_id IN (
                   SELECT batch_id FROM ingredient_batches WHERE ingredient_id = $1
                 )`,
                [ingredientId]
            );

            // 2. Delete sales
            await client.query(
                `DELETE FROM sales
                 WHERE recipe_id IN (
                   SELECT recipe_id FROM recipes
                   WHERE name LIKE $1 OR name LIKE $2 OR name LIKE $3
                 )`,
                ['%' + ingredientName + '%', '%Chicken%', '%Oil%']
            );

            // 3. Delete recipes created for this ingredient
            await client.query(
                `DELETE FROM recipes
                 WHERE name LIKE $1 OR name LIKE $2 OR name LIKE $3`,
                ['%' + ingredientName + '%', '%Chicken%', '%Oil%']
            );

            // 4. Delete waste logs
            await client.query(
                `DELETE FROM waste_logs WHERE ingredient_id = $1`,
                [ingredientId]
            );

            // 5. Delete ingredient batches
            await client.query(
                `DELETE FROM ingredient_batches WHERE ingredient_id = $1`,
                [ingredientId]
            );

            // 6. Delete the stock ingredient
            await client.query(
                `DELETE FROM stock_ingredients WHERE ingredient_id = $1`,
                [ingredientId]
            );

            console.log(`✓ Deleted: ${ingredientName}`);
        }

        // Clean up orphaned master ingredients (those not used by any ingredient)
        const orphanedRes = await client.query(`
            SELECT mi.master_ingredient_id, mi.name
            FROM master_ingredients mi
            WHERE mi.name IN ($1, $2, $3, $4, $5, $6, $7)
            AND NOT EXISTS (
              SELECT 1 FROM stock_ingredients si WHERE si.master_ingredient_id = mi.master_ingredient_id
            )
        `, testIngredients);

        for (const orphan of orphanedRes.rows) {
            await client.query(
                `DELETE FROM master_ingredients WHERE master_ingredient_id = $1`,
                [orphan.master_ingredient_id]
            );
            console.log(`✓ Deleted master ingredient: ${orphan.name}`);
        }

        await client.query('COMMIT');
        console.log('\n✨ Cleanup completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupSeedData();
