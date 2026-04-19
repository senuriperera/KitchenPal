const IngredientModel = require('../models/Ingredient');
const OCRService = require('../services/ocrService');

class IngredientController {

    // ─── GET /api/ingredients ──────────────────────────────────────────────────
    // branch_id is extracted from the JWT payload (req.user.branch_id)
    static async getIngredients(req, res) {
        try {
            const branch_id = req.user.branch_id;
            if (!branch_id) {
                return res.status(400).json({ error: 'No branch associated with this account' });
            }
            const ingredients = await IngredientModel.getAllByBranch(branch_id);
            res.json({ ingredients });
        } catch (error) {
            console.error('Get ingredients error:', error);
            res.status(500).json({ error: 'Failed to fetch ingredients' });
        }
    }

    // ─── GET /api/ingredients/:ingredient_id ──────────────────────────────────
    static async getIngredientById(req, res) {
        try {
            const { ingredient_id } = req.params;
            const ingredient = await IngredientModel.findByIdDetailed(ingredient_id);

            if (!ingredient) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json({ ingredient });
        } catch (error) {
            console.error('Get ingredient error:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient' });
        }
    }

    // ─── POST /api/ingredients ────────────────────────────────────────────────
    // All 6 steps run inside a single DB transaction in the model layer
    static async createIngredient(req, res) {
        try {
            const {
                master_ingredient_id,   // null if new custom ingredient
                name,
                quantity_in_stock,
                unit_weight,
                unit_weight_unit_id,
                price,
                storage_type_id,
                manufacture_date,
                expiry_date,
                image_url,
            } = req.body;

            // branch_id and added_by come exclusively from the JWT — never from the request body
            const branch_id = req.user.branch_id;
            const added_by = req.user.user_id;

            if (!branch_id) {
                return res.status(400).json({ error: 'No branch associated with this account' });
            }

            const ingredient = await IngredientModel.createWithTransaction({
                master_ingredient_id: master_ingredient_id || null,
                name,
                quantity_in_stock,
                unit_weight,
                unit_weight_unit_id,
                price,
                storage_type_id,
                manufacture_date: manufacture_date || null,
                expiry_date,
                image_url: image_url || null,
                added_by,
                branch_id,
            });

            // Broadcast inventory change to all connected clients
            const io = req.app && req.app.get ? req.app.get('io') : null;
            if (io) {
                io.emit('inventory:changed', {
                    action: 'created',
                    branch_id,
                    ingredient,
                });
            }

            res.status(201).json({
                message: 'Ingredient added successfully',
                ingredient,
            });
        } catch (error) {
            console.error('Create ingredient error:', error);
            res.status(500).json({ error: `Failed to create ingredient: ${error.message}` });
        }
    }

    // ─── GET /api/ingredients/existing ────────────────────────────────────────
    static async getExistingIngredient(req, res) {
        try {
            const branch_id = req.user.branch_id;
            const { master_ingredient_id } = req.query;

            if (!branch_id) {
                return res.status(400).json({ error: 'No branch associated with this account' });
            }

            if (!master_ingredient_id) {
                return res.status(400).json({ error: 'master_ingredient_id is required' });
            }

            const existing = await IngredientModel.findExistingByMasterIngredient(
                branch_id,
                master_ingredient_id
            );

            if (!existing) {
                return res.status(204).send();
            }

            res.json({ ingredient: existing });
        } catch (error) {
            console.error('Get existing ingredient error:', error);
            res.status(500).json({ error: 'Failed to fetch existing ingredient' });
        }
    }

    // ─── DELETE /api/ingredients/:ingredient_id ───────────────────────────────
    static async deleteIngredient(req, res) {
        try {
            const { ingredient_id } = req.params;
            await IngredientModel.delete(ingredient_id);
            // Broadcast inventory change to all connected clients
            const io = req.app && req.app.get ? req.app.get('io') : null;
            const branch_id = req.user ? req.user.branch_id : undefined;
            if (io) {
                io.emit('inventory:changed', {
                    action: 'deleted',
                    branch_id,
                    ingredient_id,
                });
            }

            res.json({ message: 'Ingredient deleted successfully' });
        } catch (error) {
            console.error('Delete ingredient error:', error);
            res.status(500).json({ error: 'Failed to delete ingredient' });
        }
    }

    // ─── GET /api/ingredients/expiring ────────────────────────────────────────
    static async getExpiringIngredients(req, res) {
        try {
            const branch_id = req.user.branch_id;
            if (!branch_id) {
                return res.status(400).json({ error: 'No branch associated with this account' });
            }
            const { days = 7 } = req.query;
            const ingredients = await IngredientModel.getExpiringIngredients(branch_id, days);
            res.json({ ingredients });
        } catch (error) {
            console.error('Get expiring ingredients error:', error);
            res.status(500).json({ error: 'Failed to fetch expiring ingredients' });
        }
    }

    // ─── POST /api/ingredients/scan ──────────────────────────────────────────
    // Expects { imageUrl } — scans an ALREADY UPLOADED Cloudinary image
    static async scanIngredient(req, res) {
        try {
            const { imageUrl } = req.body;
            if (!imageUrl) {
                return res.status(400).json({ error: 'imageUrl is required' });
            }

            const dates = await OCRService.extractDatesFromUrl(imageUrl);
            res.json(dates);
        } catch (error) {
            console.error('Scan ingredient error:', error);
            res.status(500).json({ error: `Failed to scan image: ${error.message}` });
        }
    }

    // ─── GET /api/ingredients/available-for-generation ────────────────────────
    // Returns ingredients near expiry with their lock status for recipe generation
    static async getAvailableIngredientsForRecipeGeneration(req, res) {
        try {
            const db = require('../config/database');
            const branch_id = req.user.branch_id;

            if (!branch_id) {
                return res.status(400).json({ error: 'No branch associated with this account' });
            }

            // Get all ingredients expiring within 3 days with their lock status
            const result = await db.query(`
                SELECT
                    si.ingredient_id,
                    si.name,
                    si.image_url,
                    ib.batch_id,
                    ib.remaining_base_quantity,
                    u.name as unit_name,
                    ib.expiry_date,
                    (ib.expiry_date - CURRENT_DATE) as days_until_expiry,
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM generated_recipe_triggers grt
                            JOIN generated_recipes gr ON grt.generated_id = gr.generated_id
                            WHERE grt.ingredient_id = si.ingredient_id
                            AND gr.branch_id = $1
                            AND gr.status = 'pending'
                        ) THEN 'awaiting_approval'
                        WHEN EXISTS (
                            SELECT 1 FROM generated_recipe_triggers grt
                            JOIN generated_recipes gr ON grt.generated_id = gr.generated_id
                            WHERE grt.ingredient_id = si.ingredient_id
                            AND gr.branch_id = $1
                            AND gr.status = 'approved'
                        ) THEN 'approved'
                        ELSE 'available'
                    END as status,
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM generated_recipe_triggers grt
                            JOIN generated_recipes gr ON grt.generated_id = gr.generated_id
                            JOIN recipes r ON gr.recipe_id = r.recipe_id
                            WHERE grt.ingredient_id = si.ingredient_id
                            AND gr.branch_id = $1
                            AND gr.status = 'pending'
                            LIMIT 1
                        ) THEN (
                            SELECT r.name FROM generated_recipe_triggers grt
                            JOIN generated_recipes gr ON grt.generated_id = gr.generated_id
                            JOIN recipes r ON gr.recipe_id = r.recipe_id
                            WHERE grt.ingredient_id = si.ingredient_id
                            AND gr.branch_id = $1
                            AND gr.status = 'pending'
                            LIMIT 1
                        )
                        ELSE NULL
                    END as locked_in_recipe
                FROM ingredient_batches ib
                JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                JOIN units u ON si.base_unit_id = u.unit_id
                WHERE (ib.expiry_date - CURRENT_DATE) <= 3
                AND (ib.expiry_date - CURRENT_DATE) >= 0
                AND ib.is_depleted = false
                AND si.branch_id = $1
                ORDER BY ib.expiry_date ASC
            `, [branch_id]);

            const ingredients = result.rows.map(row => ({
                ingredient_id: parseInt(row.ingredient_id),
                name: row.name,
                image_url: row.image_url,
                batch_id: parseInt(row.batch_id),
                remaining_quantity: parseFloat(row.remaining_base_quantity),
                unit_name: row.unit_name,
                expiry_date: row.expiry_date,
                days_until_expiry: parseInt(row.days_until_expiry),
                status: row.status, // 'available', 'awaiting_approval', or 'approved'
                locked_in_recipe: row.locked_in_recipe, // Recipe name if awaiting_approval
                message: row.status === 'awaiting_approval'
                    ? `Awaiting approval (Selected for ${row.locked_in_recipe})`
                    : row.status === 'approved'
                        ? 'Already used in approved recipe'
                        : null
            }));

            res.json({ ingredients });
        } catch (error) {
            console.error('Get available ingredients for generation error:', error);
            res.status(500).json({ error: 'Failed to fetch available ingredients' });
        }
    }
}

module.exports = IngredientController;
