const IngredientModel = require('../models/Ingredient');

class IngredientController {
    // Get all ingredients for a branch
    static async getAllIngredients(req, res) {
        try {
            const { branch_id } = req.params;
            const ingredients = await IngredientModel.getAllByBranch(branch_id);

            res.json({ ingredients });
        } catch (error) {
            console.error('Get ingredients error:', error);
            res.status(500).json({ error: 'Failed to fetch ingredients' });
        }
    }

    // Get ingredient by ID
    static async getIngredientById(req, res) {
        try {
            const { id } = req.params;
            const ingredient = await IngredientModel.findById(id);

            if (!ingredient) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json({ ingredient });
        } catch (error) {
            console.error('Get ingredient error:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient' });
        }
    }

    // Create new ingredient
    static async createIngredient(req, res) {
        try {
            const {
                branch_id,
                name,
                quantity,
                unit_id,
                price,
                expiry_date,
                manufacture_date,
                storage_type_id,
                image_url,
            } = req.body;

            const ingredient = await IngredientModel.create({
                branch_id,
                name,
                quantity,
                unit_id,
                price,
                expiry_date,
                manufacture_date,
                storage_type_id,
                image_url,
            });

            res.status(201).json({
                message: 'Ingredient created successfully',
                ingredient,
            });
        } catch (error) {
            console.error('Create ingredient error:', error);
            res.status(500).json({ error: 'Failed to create ingredient' });
        }
    }

    // Update ingredient
    static async updateIngredient(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const ingredient = await IngredientModel.update(id, updates);

            if (!ingredient) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json({
                message: 'Ingredient updated successfully',
                ingredient,
            });
        } catch (error) {
            console.error('Update ingredient error:', error);
            res.status(500).json({ error: 'Failed to update ingredient' });
        }
    }

    // Delete ingredient
    static async deleteIngredient(req, res) {
        try {
            const { id } = req.params;
            await IngredientModel.delete(id);

            res.json({ message: 'Ingredient deleted successfully' });
        } catch (error) {
            console.error('Delete ingredient error:', error);
            res.status(500).json({ error: 'Failed to delete ingredient' });
        }
    }

    // Get expiring ingredients
    static async getExpiringIngredients(req, res) {
        try {
            const { branch_id } = req.params;
            const { days = 7 } = req.query;

            const ingredients = await IngredientModel.getExpiringIngredients(branch_id, days);

            res.json({ ingredients });
        } catch (error) {
            console.error('Get expiring ingredients error:', error);
            res.status(500).json({ error: 'Failed to fetch expiring ingredients' });
        }
    }

    // Get monthly statistics
    static async getMonthlyStats(req, res) {
        try {
            const { branch_id } = req.params;
            const { year, month } = req.query;

            const currentDate = new Date();
            const statsYear = year || currentDate.getFullYear();
            const statsMonth = month || currentDate.getMonth() + 1;

            const stats = await IngredientModel.getMonthlyStats(branch_id, statsYear, statsMonth);

            res.json({ stats });
        } catch (error) {
            console.error('Get monthly stats error:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    }
}

module.exports = IngredientController;
