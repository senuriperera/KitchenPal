const MasterIngredientModel = require('../models/MasterIngredient');

class MasterIngredientController {
    
    static async search(req, res) {
        try {
            const { q = '', limit = 20 } = req.query;

            if (!q.trim()) {
                return res.json({ ingredients: [] });
            }

            const ingredients = await MasterIngredientModel.search(q.trim(), parseInt(limit));
            res.json({ ingredients });
        } catch (error) {
            console.error('Search master ingredients error:', error);
            res.status(500).json({ error: 'Failed to search ingredients' });
        }
    }

    
    static async getAll(req, res) {
        try {
            const ingredients = await MasterIngredientModel.getAll();
            res.json({ ingredients });
        } catch (error) {
            console.error('Get all master ingredients error:', error);
            res.status(500).json({ error: 'Failed to fetch ingredients' });
        }
    }

    
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const ingredient = await MasterIngredientModel.findById(id);

            if (!ingredient) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json({ ingredient });
        } catch (error) {
            console.error('Get master ingredient error:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient' });
        }
    }

    
    static async create(req, res) {
        try {
            const { name, default_unit_id, is_custom } = req.body;

            if (!name?.trim()) {
                return res.status(400).json({ error: 'Name is required' });
            }

            const existing = await MasterIngredientModel.findByName(name.trim());
            if (existing) {
                return res.status(409).json({
                    error: 'Ingredient already exists',
                    ingredient: existing
                });
            }

            const ingredient = await MasterIngredientModel.create({
                name: name.trim(),
                default_unit_id,
                is_custom: is_custom ?? true
            });

            res.status(201).json({
                message: 'Master ingredient created successfully',
                ingredient
            });
        } catch (error) {
            console.error('Create master ingredient error:', error);
            res.status(500).json({ error: 'Failed to create ingredient' });
        }
    }

    
    static async findOrCreate(req, res) {
        try {
            const { name, default_unit_id, unit_id } = req.body;

            if (!name?.trim()) {
                return res.status(400).json({ error: 'Name is required' });
            }

            const { ingredient, created } = await MasterIngredientModel.findOrCreate({
                name: name.trim(),
                default_unit_id,
                unit_id
            });

            res.status(created ? 201 : 200).json({
                message: created ? 'Master ingredient created' : 'Master ingredient found',
                ingredient,
                created
            });
        } catch (error) {
            console.error('Find or create master ingredient error:', error);
            res.status(500).json({ error: 'Failed to find or create ingredient' });
        }
    }

    
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, default_unit_id } = req.body;

            const ingredient = await MasterIngredientModel.update(id, { name, default_unit_id });

            if (!ingredient) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json({
                message: 'Master ingredient updated successfully',
                ingredient
            });
        } catch (error) {
            console.error('Update master ingredient error:', error);
            res.status(500).json({ error: 'Failed to update ingredient' });
        }
    }

    
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await MasterIngredientModel.delete(id);
            res.json({ message: 'Master ingredient deleted successfully' });
        } catch (error) {
            console.error('Delete master ingredient error:', error);
            res.status(500).json({ error: 'Failed to delete ingredient' });
        }
    }
}

module.exports = MasterIngredientController;
