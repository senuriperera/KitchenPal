const { Pool } = require('pg');
const config = require('./src/config/config');

const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
});

async function seedAnalyticsData() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get or create branch
        const branchRes = await client.query(
            "SELECT branch_id FROM branches LIMIT 1"
        );
        const branchId = branchRes.rows[0]?.branch_id || 1;

        // Get or create user
        const userRes = await client.query(
            "SELECT user_id FROM users WHERE role IN ('admin', 'branch_manager', 'staff') LIMIT 1"
        );
        const userId = userRes.rows[0]?.user_id || 1;

        // Get unit IDs
        const unitsRes = await client.query("SELECT unit_id, code FROM units");
        const units = {};
        unitsRes.rows.forEach(row => {
            units[row.code] = row.unit_id;
        });

        // Get storage type
        const storageRes = await client.query(
            "SELECT storage_type_id FROM storage_types WHERE code = 'FRIDGE' LIMIT 1"
        );
        const storageTypeId = storageRes.rows[0]?.storage_type_id || 1;

        console.log('🌱 Creating sample analytics data...');
        console.log(`   Branch ID: ${branchId}, User ID: ${userId}`);

        // ===== SCENARIO 1: EXPIRED INGREDIENTS =====
        console.log('\n📦 Scenario 1: Expired Ingredients');

        const expiredIngredients = [
            { name: 'Expired Milk', family: 'volume', baseUnit: 'ml', price: 150 },
            { name: 'Expired Butter', family: 'weight', baseUnit: 'g', price: 300 },
            { name: 'Expired Yogurt', family: 'volume', baseUnit: 'ml', price: 120 },
        ];

        for (const ing of expiredIngredients) {
            // Create master ingredient
            const masterRes = await client.query(
                `INSERT INTO master_ingredients (name, unit_family, base_unit_id, default_unit_id, is_custom)
                 VALUES ($1, $2, $3, $4, false)
                 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING master_ingredient_id`,
                [ing.name, ing.family, units[ing.baseUnit], units[ing.baseUnit]]
            );
            const masterIngId = masterRes.rows[0].master_ingredient_id;

            // Create stock ingredient
            const stockRes = await client.query(
                `INSERT INTO stock_ingredients
                 (branch_id, master_ingredient_id, name, quantity_in_stock, unit_weight, unit_weight_unit_id,
                  total_base_quantity, base_unit_id, manufacture_date, expiry_date, storage_type_id, price, added_by, added_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() - INTERVAL '30 days')
                 RETURNING ingredient_id`,
                [branchId, masterIngId, ing.name, 5, 1000, units[ing.baseUnit], 5000, units[ing.baseUnit],
                    new Date('2026-02-01'), new Date('2026-03-15'), storageTypeId, ing.price, userId]
            );
            const ingredientId = stockRes.rows[0].ingredient_id;

            // Create batch that expired 15 days ago
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 15);

            const batchRes = await client.query(
                `INSERT INTO ingredient_batches
                 (ingredient_id, quantity, remaining_quantity, unit_weight, unit_weight_unit_id,
                  remaining_base_quantity, base_unit_id, manufacture_date, expiry_date, is_depleted)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                 RETURNING batch_id`,
                [ingredientId, 5, 5, 1000, units[ing.baseUnit], 5000, units[ing.baseUnit],
                    new Date('2026-02-01'), expiredDate]
            );
            const batchId = batchRes.rows[0].batch_id;

            // Log waste for expired ingredient
            await client.query(
                `INSERT INTO waste_logs (branch_id, ingredient_id, batch_id, quantity_wasted, unit_id, reason, logged_by, logged_at)
                 VALUES ($1, $2, $3, $4, $5, 'expired', $6, NOW() - INTERVAL '10 days')`,
                [branchId, ingredientId, batchId, 5000, units[ing.baseUnit], userId]
            );

            console.log(`   ✓ ${ing.name} - Expired on ${expiredDate.toDateString()}`);
        }

        // ===== SCENARIO 2: EXPIRY NEARING INGREDIENTS =====
        console.log('\n⏰ Scenario 2: Expiry Nearing (1-3 days)');

        const nearing = [
            { name: 'Nearing - Cheese', family: 'weight', baseUnit: 'g', price: 400 },
            { name: 'Nearing - Cream', family: 'volume', baseUnit: 'ml', price: 250 },
        ];

        for (const ing of nearing) {
            const masterRes = await client.query(
                `INSERT INTO master_ingredients (name, unit_family, base_unit_id, default_unit_id, is_custom)
                 VALUES ($1, $2, $3, $4, false)
                 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING master_ingredient_id`,
                [ing.name, ing.family, units[ing.baseUnit], units[ing.baseUnit]]
            );
            const masterIngId = masterRes.rows[0].master_ingredient_id;

            const stockRes = await client.query(
                `INSERT INTO stock_ingredients
                 (branch_id, master_ingredient_id, name, quantity_in_stock, unit_weight, unit_weight_unit_id,
                  total_base_quantity, base_unit_id, manufacture_date, expiry_date, storage_type_id, price, added_by, added_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() - INTERVAL '20 days')
                 RETURNING ingredient_id`,
                [branchId, masterIngId, ing.name, 8, 500, units[ing.baseUnit], 4000, units[ing.baseUnit],
                    new Date('2026-03-15'), new Date('2026-04-18'), storageTypeId, ing.price, userId]
            );
            const ingredientId = stockRes.rows[0].ingredient_id;

            // Create batch expiring in 2 days
            const nearingDate = new Date();
            nearingDate.setDate(nearingDate.getDate() + 2);

            await client.query(
                `INSERT INTO ingredient_batches
                 (ingredient_id, quantity, remaining_quantity, unit_weight, unit_weight_unit_id,
                  remaining_base_quantity, base_unit_id, manufacture_date, expiry_date, is_depleted)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
                [ingredientId, 8, 8, 500, units[ing.baseUnit], 4000, units[ing.baseUnit],
                    new Date('2026-03-15'), nearingDate]
            );

            console.log(`   ✓ ${ing.name} - Expires on ${nearingDate.toDateString()}`);
        }

        // ===== SCENARIO 3: USED EFFICIENTLY (Good Inventory) =====
        console.log('\n✅ Scenario 3: Used Efficiently (Not Expired)');

        const efficient = [
            { name: 'Efficient - Chicken Breast', family: 'weight', baseUnit: 'g', price: 600, quantityToUse: 3500 },
            { name: 'Efficient - Olive Oil', family: 'volume', baseUnit: 'ml', price: 450, quantityToUse: 3000 },
        ];

        for (const ing of efficient) {
            const masterRes = await client.query(
                `INSERT INTO master_ingredients (name, unit_family, base_unit_id, default_unit_id, is_custom)
                 VALUES ($1, $2, $3, $4, false)
                 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING master_ingredient_id`,
                [ing.name, ing.family, units[ing.baseUnit], units[ing.baseUnit]]
            );
            const masterIngId = masterRes.rows[0].master_ingredient_id;

            const stockRes = await client.query(
                `INSERT INTO stock_ingredients
                 (branch_id, master_ingredient_id, name, quantity_in_stock, unit_weight, unit_weight_unit_id,
                  total_base_quantity, base_unit_id, manufacture_date, expiry_date, storage_type_id, price, added_by, added_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() - INTERVAL '40 days')
                 RETURNING ingredient_id`,
                [branchId, masterIngId, ing.name, 10, 1000, units[ing.baseUnit], 10000, units[ing.baseUnit],
                    new Date('2026-02-01'), new Date('2026-05-20'), storageTypeId, ing.price, userId]
            );
            const ingredientId = stockRes.rows[0].ingredient_id;

            // Create batch expiring in 30+ days (plenty of time)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            const batchRes = await client.query(
                `INSERT INTO ingredient_batches
                 (ingredient_id, quantity, remaining_quantity, unit_weight, unit_weight_unit_id,
                  remaining_base_quantity, base_unit_id, manufacture_date, expiry_date, is_depleted)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
                 RETURNING batch_id`,
                [ingredientId, 10, 10 - (ing.quantityToUse / 1000), 1000, units[ing.baseUnit],
                    10000 - ing.quantityToUse, units[ing.baseUnit], new Date('2026-02-01'), expiryDate]
            );
            const batchId = batchRes.rows[0].batch_id;

            // Create a dummy recipe to tie the sale to
            const recipeRes = await client.query(
                `INSERT INTO recipes (branch_id, name, base_price, total_servings, is_generated, is_active, created_by, created_at)
                 VALUES ($1, $2, $3, 1, false, true, $4, NOW())
                 RETURNING recipe_id`,
                [branchId, `Recipe using ${ing.name}`, ing.price * 1.5, userId]
            );
            const recipeId = recipeRes.rows[0].recipe_id;

            // Create sale deduction showing this was sold/used
            const saleRes = await client.query(
                `INSERT INTO sales (branch_id, recipe_id, quantity_sold, base_price_per_unit, total_revenue, sold_by, sold_at)
                 VALUES ($1, $2, 1, $3, $4, $5, NOW() - INTERVAL '10 days')
                 RETURNING sale_id`,
                [branchId, recipeId, ing.price * 1.5, ing.price * 1.5 * 1.2, userId]
            );
            const saleId = saleRes.rows[0].sale_id;

            // Create deduction record
            await client.query(
                `INSERT INTO sale_deductions (sale_id, batch_id, quantity_deducted)
                 VALUES ($1, $2, $3)`,
                [saleId, batchId, ing.quantityToUse]
            );

            console.log(`   ✓ ${ing.name} - Purchased 40 days ago, ${(ing.quantityToUse / 1000) * 100}% used efficiently`);
        }

        await client.query('COMMIT');
        console.log('\n✨ Analytics seed data created successfully!');
        console.log('\n📊 Data Summary:');
        console.log('   - 3 Expired ingredients (wasted)');
        console.log('   - 2 Expiry-nearing ingredients (use urgently)');
        console.log('   - 2 Well-used ingredients (efficient usage)');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding data:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seedAnalyticsData();
