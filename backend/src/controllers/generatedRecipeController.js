const db = require('../config/database');

/**
 * POST /api/generated-recipes
 * Save staff's chosen recipe as a generated recipe (pending admin approval).
 */
async function createGeneratedRecipe(req, res) {
    const { recipe_id, suggested_discount_percent, suggested_discount_price, selected_batches } =
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
         status,
         is_active,
         created_at
       ) VALUES (
         $1, $2, $3, $4, $5, NULL, NULL, 'pending', true, NOW()
       )
       RETURNING generated_id`,
            [branchId, recipe_id, userId, suggested_discount_percent, suggested_discount_price]
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
        const ingredientIds = selected_batches
            .map((b) => b.ingredient_id)
            .filter((id) => id != null);

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
            `SELECT user_id
       FROM users
       WHERE role = 'admin'
         AND is_active = true
       ORDER BY user_id ASC
       LIMIT 1`
        );

        if (adminResult.rows[0]) {
            const adminUserId = adminResult.rows[0].user_id;

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
        }

        await client.query('COMMIT');

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
         gr.status,
         gr.admin_note,
         gr.generated_by,
         gr.created_at,
         r.name,
         r.image_url,
         r.cooking_time_minutes,
         r.description,
         r.base_price,
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
         u.name AS generated_by_name,
         b.name AS branch_name
       FROM generated_recipes gr
       JOIN recipes r ON gr.recipe_id = r.recipe_id
       JOIN users u ON gr.generated_by = u.user_id
       JOIN branches b ON gr.branch_id = b.branch_id
       WHERE gr.status = 'pending'
       ORDER BY gr.created_at ASC`
        );

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
            `SELECT user_id
       FROM users
       WHERE branch_id = $1
         AND role IN ('staff', 'branch_manager')
         AND is_active = true`,
            [branchId]
        );

        for (const row of staffResult.rows) {
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

        await client.query('COMMIT');

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
            `SELECT user_id
       FROM users
       WHERE branch_id = $1
         AND role IN ('staff', 'branch_manager')
         AND is_active = true`,
            [branchId]
        );

        for (const row of staffResult.rows) {
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

        await client.query('COMMIT');

        return res.json({ message: 'Generated recipe rejected successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error rejecting generated recipe:', err);
        return res.status(500).json({ error: 'Failed to reject generated recipe' });
    } finally {
        client.release();
    }
}

module.exports = {
    createGeneratedRecipe,
    getGeneratedRecipesForBranch,
    getPendingGeneratedRecipes,
    approveGeneratedRecipe,
    rejectGeneratedRecipe,
};
