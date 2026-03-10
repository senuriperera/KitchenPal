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
}

module.exports = IngredientController;
