const db = require('../config/database');
const RecipeModel = require('../models/Recipe');

/**
 * POST /api/generated-recipes
 * Save staff's chosen recipe as a generated recipe (pending admin approval).
 */
async function createGeneratedRecipe(req, res) {
    const { recipe_id, suggested_discount_percent, suggested_discount_price, selected_batches, suggested_servings } =
        req.body || {};

    if (!recipe_id || !suggested_discount_percent || !suggested_discount_price) {
        return res
            .status(400)
            .json({ error: 'recipe_id, suggested_discount_percent and suggested_discount_price are required' });
    }

    if (!Array.isArray(selected_batches) || selected_batches.length === 0) {
        return res.status(400).json({ error: 'selected_batches array is required' });
    }

    const userId = req.user && req.user.user_id;
    const branchId = req.user && req.user.branch_id;

    if (!userId || !branchId) {
        return res.status(400).json({ error: 'Missing user or branch information in token' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Check if any of the selected ingredients are already locked in pending recipes
        const ingredientIds = selected_batches
            .map((b) => b.ingredient_id)
            .filter((id) => id != null);

        if (ingredientIds.length > 0) {
            const lockedIngredientsResult = await client.query(
                `SELECT DISTINCT grt.ingredient_id
           FROM generated_recipe_triggers grt
           JOIN generated_recipes gr ON grt.generated_id = gr.generated_id
           WHERE gr.branch_id = $1
             AND gr.status = 'pending'
             AND grt.ingredient_id = ANY($2)`,
                [branchId, ingredientIds]
            );

            if (lockedIngredientsResult.rows.length > 0) {
                await client.query('ROLLBACK');
                const lockedIngredientIds = lockedIngredientsResult.rows.map(row => row.ingredient_id);
                return res.status(400).json({
                    error: 'One or more selected ingredients are already locked in pending recipes',
                    locked_ingredient_ids: lockedIngredientIds
                });
            }
        }

        // 1) Insert into generated_recipes
        const insertRecipeResult = await client.query(
            `INSERT INTO generated_recipes (
         branch_id,
         recipe_id,
         generated_by,
         suggested_discount_percent,
         suggested_discount_price,
         final_discount_percent,
         final_discount_price,
         suggested_servings,
         status,
         is_active,
         created_at
       ) VALUES (
         $1, $2, $3, $4, $5, NULL, NULL, $6, 'pending', true, NOW()
       )
       RETURNING generated_id`,
            [branchId, recipe_id, userId, suggested_discount_percent, suggested_discount_price, suggested_servings || 1]
        );

        const generatedId = insertRecipeResult.rows[0].generated_id;

        // 2) Insert into generated_recipe_triggers (one row per selected batch)
        const triggerValues = [];
        for (const batch of selected_batches) {
            if (!batch.ingredient_id || !batch.expiry_date) continue;
            triggerValues.push([generatedId, batch.ingredient_id, batch.expiry_date]);
        }

        if (triggerValues.length > 0) {
            const valuesSql = triggerValues
                .map((_, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`)
                .join(', ');
            const flat = triggerValues.flat();

            await client.query(
                `INSERT INTO generated_recipe_triggers (generated_id, ingredient_id, expiry_date)
         VALUES ${valuesSql}`,
                flat
            );
        }

        // 3) Mark corresponding expiry_alert notifications as read for this staff member
        if (ingredientIds.length > 0) {
            await client.query(
                `UPDATE notifications
         SET status = 'read', is_read = true, acknowledged_at = NOW()
         WHERE ingredient_id = ANY($1)
           AND user_id = $2
           AND notification_type = 'expiry_alert'
           AND status = 'unread'`,
                [ingredientIds, userId]
            );
        }

        // 4) Fetch an active admin user
        const adminResult = await client.query(
            `SELECT user_id, name, role
       FROM users
       WHERE role IN ('admin', 'ADMIN')
         AND is_active = true
       ORDER BY user_id ASC
       LIMIT 1`
        );

        console.log('Admin users found:', adminResult.rows.length);
        if (adminResult.rows.length > 0) {
            console.log('Admin user details:', adminResult.rows[0]);
        }

        if (adminResult.rows[0]) {
            const adminUserId = adminResult.rows[0].user_id;
            console.log('Creating recipe_pending notification for admin user:', adminUserId);

            await client.query(
                `INSERT INTO notifications (
           user_id,
           branch_id,
           ingredient_id,
           title,
           message,
           notification_type,
           status,
           is_read,
           created_at
         ) VALUES (
           $1, $2, NULL,
           'New Recipe Pending Approval',
           'A generated recipe is waiting for your discount approval',
           'recipe_pending',
           'unread',
           false,
           NOW()
         )`,
                [adminUserId, branchId]
            );
            console.log('Recipe pending notification created successfully');
        } else {
            console.log('No active admin user found');
        }

        // 5) Fetch the newly created recipe details for WebSocket
        const recipeDetailsResult = await client.query(
            `SELECT
         gr.generated_id,
         gr.suggested_discount_percent,
         gr.suggested_discount_price,
         gr.created_at,
         r.name,
         r.image_url,
         r.base_price,
         r.cooking_time_minutes,
         u.name AS generated_by_name,
         b.name AS branch_name,
         r.recipe_id
       FROM generated_recipes gr
       JOIN recipes r ON gr.recipe_id = r.recipe_id
       JOIN users u ON gr.generated_by = u.user_id
       JOIN branches b ON gr.branch_id = b.branch_id
       WHERE gr.generated_id = $1`,
            [generatedId]
        );

        await client.query('COMMIT');

        // Emit WebSocket event to notify clients of status change
        const io = req.app && req.app.get ? req.app.get('io') : null;
        if (io) {
            const triggerResult = await db.query(
                `SELECT ingredient_id FROM generated_recipe_triggers WHERE generated_id = $1`,
                [generatedId]
            );
            const ingredientIds = triggerResult.rows.map(row => row.ingredient_id);
            const recipeName = recipeDetailsResult.rows[0]?.name || 'Recipe';

            io.emit('recipe:generated', {
                generated_id: generatedId,
                branch_id: branchId,
                ingredient_ids: ingredientIds,
                status: 'pending',
                recipe_name: recipeName,
            });
        }

        return res.status(201).json({ generated_id: generatedId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating generated recipe:', err);
        return res.status(500).json({ error: 'Failed to create generated recipe' });
    } finally {
        client.release();
    }
}

/**
 * GET /api/generated-recipes
 * List generated recipes for the current staff branch.
 */
async function getGeneratedRecipesForBranch(req, res) {
    try {
        const branchId = req.user && req.user.branch_id;
        if (!branchId) {
            return res.status(400).json({ error: 'No branch associated with this account' });
        }

        const result = await db.query(
            `SELECT
         gr.generated_id,
         gr.recipe_id,
         gr.suggested_discount_percent,
         gr.suggested_discount_price,
         gr.final_discount_percent,
         gr.final_discount_price,
         gr.suggested_servings,
         gr.status,
         gr.admin_note,
         gr.generated_by,
         gr.created_at,
         r.name,
         r.image_url,
         r.cooking_time_minutes,
         r.description,
         r.base_price,
         r.total_servings,
         r.serving_description,
         u.name AS generated_by_name
       FROM generated_recipes gr
       JOIN recipes r ON gr.recipe_id = r.recipe_id
       JOIN users u ON gr.generated_by = u.user_id
       WHERE gr.branch_id = $1
         AND gr.is_active = true
       ORDER BY
         CASE gr.status
           WHEN 'approved' THEN 1
           WHEN 'pending' THEN 2
           WHEN 'rejected' THEN 3
         END,
         gr.created_at DESC`,
            [branchId]
        );

        return res.json({ recipes: result.rows });
    } catch (err) {
        console.error('Error fetching generated recipes for branch:', err);
        return res.status(500).json({ error: 'Failed to fetch generated recipes' });
    }
}

/**
 * GET /api/generated-recipes/pending
 * Admin: list all pending generated recipes for discount approvals.
 */
async function getPendingGeneratedRecipes(req, res) {
    try {
        console.log('Fetching pending generated recipes...');

        // Check if there are ANY generated recipes
        const allRecipesResult = await db.query(
            `SELECT COUNT(*) as count FROM generated_recipes`
        );
        console.log('Total generated recipes in DB:', allRecipesResult.rows[0].count);

        const result = await db.query(
            `SELECT
         gr.generated_id,
         gr.suggested_discount_percent,
         gr.suggested_discount_price,
         gr.created_at,
         r.name,
         r.image_url,
         r.base_price,
         r.cooking_time_minutes,
         r.recipe_id,
         u.name AS generated_by_name,
         b.name AS branch_name,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM generated_recipe_triggers grt
             WHERE grt.generated_id = gr.generated_id
           ) THEN 'Auto-suggested'
           ELSE 'Predefined'
         END AS recipe_type
       FROM generated_recipes gr
       JOIN recipes r ON gr.recipe_id = r.recipe_id
       JOIN users u ON gr.generated_by = u.user_id
       JOIN branches b ON gr.branch_id = b.branch_id
       WHERE gr.status = 'pending'
       ORDER BY gr.created_at ASC`
        );

        console.log('Pending generated recipes found:', result.rows.length);
        return res.json({ items: result.rows });
    } catch (err) {
        console.error('Error fetching pending generated recipes:', err);
        return res.status(500).json({ error: 'Failed to fetch pending generated recipes' });
    }
}

/**
 * PUT /api/generated-recipes/:id/approve
 * Admin: approve a generated recipe and notify all staff in the branch.
 */
async function approveGeneratedRecipe(req, res) {
    const generatedId = parseInt(req.params.id, 10);
    const { final_discount_percent, final_discount_price } = req.body || {};

    if (!generatedId || final_discount_percent == null || final_discount_price == null) {
        return res
            .status(400)
            .json({ error: 'generated_id, final_discount_percent and final_discount_price are required' });
    }

    const adminUserId = req.user && req.user.user_id;

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Update generated_recipes row
        const updateResult = await client.query(
            `UPDATE generated_recipes
       SET status = 'approved',
           final_discount_percent = $1,
           final_discount_price = $2,
           reviewed_by = $3,
           reviewed_at = NOW()
       WHERE generated_id = $4
       RETURNING generated_id, branch_id, recipe_id, generated_by`,
            [final_discount_percent, final_discount_price, adminUserId, generatedId]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Generated recipe not found' });
        }

        const { branch_id: branchId, recipe_id: recipeId, generated_by: generatedBy } =
            updateResult.rows[0];

        // Fetch recipe name and generated_by_name for notifications
        const detailsResult = await client.query(
            `SELECT r.name AS recipe_name, u.name AS generated_by_name
       FROM recipes r
       JOIN users u ON u.user_id = $1
       WHERE r.recipe_id = $2`,
            [generatedBy, recipeId]
        );

        const recipeName = detailsResult.rows[0]?.recipe_name || 'Recipe';
        const generatedByName = detailsResult.rows[0]?.generated_by_name || 'staff member';

        // Fetch all active staff in this branch
        const staffResult = await client.query(
            `SELECT user_id, name, role
       FROM users
       WHERE branch_id = $1
         AND role IN ('staff', 'STAFF', 'branch_manager', 'BRANCH_MANAGER', 'manager', 'MANAGER')
         AND is_active = true`,
            [branchId]
        );

        console.log('Staff members found in branch', branchId, ':', staffResult.rows.length);
        if (staffResult.rows.length > 0) {
            console.log('Staff details:', staffResult.rows);
        }

        for (const row of staffResult.rows) {
            console.log('Creating recipe_approved notification for staff user:', row.user_id);
            await client.query(
                `INSERT INTO notifications (
           user_id,
           branch_id,
           ingredient_id,
           title,
           message,
           notification_type,
           status,
           is_read,
           created_at
         ) VALUES (
           $1, $2, NULL,
           'Recipe Approved',
           $3,
           'recipe_approved',
           'unread',
           false,
           NOW()
         )`,
                [
                    row.user_id,
                    branchId,
                    `${recipeName} has been approved with ${final_discount_percent}% discount.\nGenerated by ${generatedByName}.`,
                ]
            );
        }
        console.log('Recipe approved notifications created for', staffResult.rows.length, 'staff members');

        await client.query('COMMIT');

        // Emit WebSocket event to notify clients of status change
        const io = req.app && req.app.get ? req.app.get('io') : null;
        if (io) {
            const triggerResult = await db.query(
                `SELECT ingredient_id FROM generated_recipe_triggers WHERE generated_id = $1`,
                [generatedId]
            );
            const ingredientIds = triggerResult.rows.map(row => row.ingredient_id);

            io.emit('recipe:approved', {
                generated_id: generatedId,
                branch_id: branchId,
                ingredient_ids: ingredientIds,
                status: 'approved',
                recipe_name: recipeName,
            });
        }

        return res.json({ message: 'Generated recipe approved successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error approving generated recipe:', err);
        return res.status(500).json({ error: 'Failed to approve generated recipe' });
    } finally {
        client.release();
    }
}

/**
 * PUT /api/generated-recipes/:id/reject
 * Admin: reject a generated recipe and notify all staff in the branch.
 */
async function rejectGeneratedRecipe(req, res) {
    const generatedId = parseInt(req.params.id, 10);
    const { admin_note } = req.body || {};

    if (!generatedId || !admin_note) {
        return res.status(400).json({ error: 'generated_id and admin_note are required' });
    }

    const adminUserId = req.user && req.user.user_id;

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Update generated_recipes row
        const updateResult = await client.query(
            `UPDATE generated_recipes
       SET status = 'rejected',
           admin_note = $1,
           reviewed_by = $2,
           reviewed_at = NOW()
       WHERE generated_id = $3
       RETURNING generated_id, branch_id, recipe_id, generated_by`,
            [admin_note, adminUserId, generatedId]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Generated recipe not found' });
        }

        const { branch_id: branchId, recipe_id: recipeId, generated_by: generatedBy } =
            updateResult.rows[0];

        // Fetch recipe name and generated_by_name for notifications
        const detailsResult = await client.query(
            `SELECT r.name AS recipe_name, u.name AS generated_by_name
       FROM recipes r
       JOIN users u ON u.user_id = $1
       WHERE r.recipe_id = $2`,
            [generatedBy, recipeId]
        );

        const recipeName = detailsResult.rows[0]?.recipe_name || 'Recipe';
        const generatedByName = detailsResult.rows[0]?.generated_by_name || 'staff member';

        // Fetch all active staff in this branch
        const staffResult = await client.query(
            `SELECT user_id, name, role
       FROM users
       WHERE branch_id = $1
         AND role IN ('staff', 'STAFF', 'branch_manager', 'BRANCH_MANAGER', 'manager', 'MANAGER')
         AND is_active = true`,
            [branchId]
        );

        console.log('Staff members found in branch', branchId, ':', staffResult.rows.length);
        if (staffResult.rows.length > 0) {
            console.log('Staff details:', staffResult.rows);
        }

        for (const row of staffResult.rows) {
            console.log('Creating recipe_rejected notification for staff user:', row.user_id);
            await client.query(
                `INSERT INTO notifications (
           user_id,
           branch_id,
           ingredient_id,
           title,
           message,
           notification_type,
           status,
           is_read,
           created_at
         ) VALUES (
           $1, $2, NULL,
           'Recipe Rejected',
           $3,
           'recipe_rejected',
           'unread',
           false,
           NOW()
         )`,
                [
                    row.user_id,
                    branchId,
                    `${recipeName} was rejected by admin. Generated by ${generatedByName}.\nNote: ${admin_note}`,
                ]
            );
        }
        console.log('Recipe rejected notifications created for', staffResult.rows.length, 'staff members');

        await client.query('COMMIT');

        // Emit WebSocket event to notify clients of status change
        const io = req.app && req.app.get ? req.app.get('io') : null;
        if (io) {
            const triggerResult = await db.query(
                `SELECT ingredient_id FROM generated_recipe_triggers WHERE generated_id = $1`,
                [generatedId]
            );
            const ingredientIds = triggerResult.rows.map(row => row.ingredient_id);

            io.emit('recipe:rejected', {
                generated_id: generatedId,
                branch_id: branchId,
                ingredient_ids: ingredientIds,
                status: 'available',
                admin_note: admin_note,
            });
        }

        return res.json({ message: 'Generated recipe rejected successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error rejecting generated recipe:', err);
        return res.status(500).json({ error: 'Failed to reject generated recipe' });
    } finally {
        client.release();
    }
}

/**
 * GET /api/generated-recipes/recently-approved
 * Admin: list recently approved generated recipes (last 10).
 */
async function getRecentlyApprovedRecipes(req, res) {
    try {
        const result = await db.query(
            `SELECT
         gr.generated_id,
         gr.final_discount_percent,
         gr.final_discount_price,
         gr.reviewed_at,
         r.name,
         r.image_url,
         r.base_price,
         r.cooking_time_minutes,
         r.recipe_id,
         u.name AS generated_by_name,
         b.name AS branch_name,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM generated_recipe_triggers grt
             WHERE grt.generated_id = gr.generated_id
           ) THEN 'Auto-suggested'
           ELSE 'Predefined'
         END AS recipe_type
       FROM generated_recipes gr
       JOIN recipes r ON gr.recipe_id = r.recipe_id
       JOIN users u ON gr.generated_by = u.user_id
       JOIN branches b ON gr.branch_id = b.branch_id
       WHERE gr.status = 'approved'
       ORDER BY gr.reviewed_at DESC
       LIMIT 10`
        );

        return res.json({ items: result.rows });
    } catch (err) {
        console.error('Error fetching recently approved recipes:', err);
        return res.status(500).json({ error: 'Failed to fetch recently approved recipes' });
    }
}

/**
 * GET /api/generated-recipes/recently-rejected
 * Admin: list recently rejected generated recipes (last 10).
 */
async function getRecentlyRejectedRecipes(req, res) {
    try {
        const result = await db.query(
            `SELECT
         gr.generated_id,
         gr.admin_note,
         gr.reviewed_at,
         r.name,
         r.image_url,
         r.base_price,
         r.cooking_time_minutes,
         r.recipe_id,
         u.name AS generated_by_name,
         b.name AS branch_name,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM generated_recipe_triggers grt
             WHERE grt.generated_id = gr.generated_id
           ) THEN 'Auto-suggested'
           ELSE 'Predefined'
         END AS recipe_type
       FROM generated_recipes gr
       JOIN recipes r ON gr.recipe_id = r.recipe_id
       JOIN users u ON gr.generated_by = u.user_id
       JOIN branches b ON gr.branch_id = b.branch_id
       WHERE gr.status = 'rejected'
       ORDER BY gr.reviewed_at DESC
       LIMIT 10`
        );

        return res.json({ items: result.rows });
    } catch (err) {
        console.error('Error fetching recently rejected recipes:', err);
        return res.status(500).json({ error: 'Failed to fetch recently rejected recipes' });
    }
}

/**
 * GET /api/generated-recipes/:id/ingredients
 * Get ingredients for a generated recipe.
 */
async function getGeneratedRecipeIngredients(req, res) {
    const generatedId = parseInt(req.params.id, 10);

    if (!generatedId) {
        return res.status(400).json({ error: 'Invalid generated_id' });
    }

    try {
        // First get the recipe_id from generated_recipes
        const generatedRecipeResult = await db.query(
            `SELECT recipe_id FROM generated_recipes WHERE generated_id = $1`,
            [generatedId]
        );

        if (generatedRecipeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Generated recipe not found' });
        }

        const recipeId = generatedRecipeResult.rows[0].recipe_id;

        // Reuse the central Recipe model to fetch ingredients
        const recipeIngredients = await RecipeModel.getIngredients(recipeId);

        const ingredients = recipeIngredients.map((row) => ({
            recipe_ingredient_id: row.recipe_ingredient_id,
            quantity: Number(row.quantity_required),
            unit: row.unit_code || row.unit_name || '',
            ingredient_id: row.master_ingredient_id,
            name: row.ingredient_name || 'Unknown ingredient',
        }));

        return res.json({ ingredients });
    } catch (err) {
        console.error('Error fetching generated recipe ingredients:', err);
        return res.status(500).json({ error: 'Failed to fetch ingredients' });
    }
}

module.exports = {
    createGeneratedRecipe,
    getGeneratedRecipesForBranch,
    getPendingGeneratedRecipes,
    approveGeneratedRecipe,
    rejectGeneratedRecipe,
    getRecentlyApprovedRecipes,
    getRecentlyRejectedRecipes,
    getGeneratedRecipeIngredients,
};
