const Recipe = require('../models/Recipe');

class RecipeController {
    /**
     * Get all standard recipes with ingredients
     * GET /api/recipes
     */
    static async getAllRecipes(req, res) {
        try {
            const recipes = await Recipe.getAllStandardRecipes();
            res.json({ recipes });
        } catch (error) {
            console.error('Get all recipes error:', error);
            res.status(500).json({ error: 'Failed to fetch recipes' });
        }
    }

    /**
     * Get a single recipe by ID
     * GET /api/recipes/:id
     */
    static async getRecipeById(req, res) {
        try {
            const { id } = req.params;
            const recipe = await Recipe.getStandardRecipeById(id);

            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            res.json({ recipe });
        } catch (error) {
            console.error('Get recipe error:', error);
            res.status(500).json({ error: 'Failed to fetch recipe' });
        }
    }

    /**
     * Create a new recipe with ingredients and keywords
     * POST /api/recipes
     * Body: {
     *   name, image_url, cooking_time_minutes, description, base_price,
     *   ingredients: [{master_ingredient_id, quantity_required, unit_id}]
     * }
     */
    static async createRecipe(req, res) {
        try {
            const { name, image_url, cooking_time_minutes, description, base_price, ingredients } = req.body;

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'Recipe name is required' });
            }

            if (!base_price || base_price <= 0) {
                return res.status(400).json({ error: 'Valid base price is required' });
            }

            if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
                return res.status(400).json({ error: 'At least one ingredient is required' });
            }

            // Validate each ingredient
            for (const ing of ingredients) {
                if (!ing.master_ingredient_id || !ing.quantity_required || !ing.unit_id) {
                    return res.status(400).json({
                        error: 'Each ingredient must have master_ingredient_id, quantity_required, and unit_id'
                    });
                }

                if (ing.quantity_required <= 0) {
                    return res.status(400).json({ error: 'Ingredient quantity must be greater than 0' });
                }
            }

            // Get user ID from authenticated request (if auth middleware is set up)
            const created_by = req.user?.user_id || null;

            const recipeData = {
                name: name.trim(),
                image_url,
                cooking_time_minutes,
                description,
                base_price,
                created_by
            };

            const recipe = await Recipe.createStandardRecipe(recipeData, ingredients);

            res.status(201).json({
                message: 'Recipe created successfully',
                recipe
            });
        } catch (error) {
            console.error('Create recipe error:', error);

            // Handle specific database errors
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Recipe with this name already exists' });
            }
            if (error.code === '23503') { // Foreign key violation
                return res.status(400).json({ error: 'Invalid ingredient or unit ID' });
            }

            res.status(500).json({ error: 'Failed to create recipe' });
        }
    }

    /**
     * Update a recipe
     * PUT /api/recipes/:id
     */
    static async updateRecipe(req, res) {
        try {
            const { id } = req.params;
            const { name, image_url, cooking_time_minutes, description, base_price, ingredients } = req.body;

            console.log('Update recipe request:', { id, name, base_price, ingredientsCount: ingredients?.length });

            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'Recipe name is required' });
            }

            if (!base_price || base_price <= 0) {
                return res.status(400).json({ error: 'Valid base price is required' });
            }

            // Validate ingredients if provided
            if (ingredients) {
                if (!Array.isArray(ingredients) || ingredients.length === 0) {
                    return res.status(400).json({ error: 'At least one ingredient is required' });
                }

                for (const ing of ingredients) {
                    if (!ing.master_ingredient_id || !ing.quantity_required || !ing.unit_id) {
                        return res.status(400).json({
                            error: 'Each ingredient must have master_ingredient_id, quantity_required, and unit_id'
                        });
                    }

                    if (ing.quantity_required <= 0) {
                        return res.status(400).json({ error: 'Ingredient quantity must be greater than 0' });
                    }
                }
            }

            const recipeData = {
                name: name.trim(),
                image_url,
                cooking_time_minutes,
                description,
                base_price
            };

            let recipe;
            if (ingredients) {
                // Update recipe with ingredients (transaction)
                console.log('Updating recipe with ingredients...');
                recipe = await Recipe.updateWithIngredients(id, recipeData, ingredients);
            } else {
                // Update recipe only
                console.log('Updating recipe only (no ingredients)...');
                recipe = await Recipe.update(id, recipeData);
            }

            if (!recipe) {
                console.log('Recipe not found:', id);
                return res.status(404).json({ error: 'Recipe not found' });
            }

            console.log('Recipe updated successfully:', recipe.recipe_id);
            res.json({
                message: 'Recipe updated successfully',
                recipe
            });
        } catch (error) {
            console.error('Update recipe error:', error);

            // Handle specific database errors
            if (error.code === '23503') { // Foreign key violation
                return res.status(400).json({ error: 'Invalid ingredient or unit ID' });
            }

            res.status(500).json({ error: 'Failed to update recipe' });
        }
    }

    /**
     * Delete a recipe (soft delete)
     * DELETE /api/recipes/:id
     */
    static async deleteRecipe(req, res) {
        try {
            const { id } = req.params;
            const recipe = await Recipe.delete(id);

            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            res.json({ message: 'Recipe deleted successfully' });
        } catch (error) {
            console.error('Delete recipe error:', error);
            res.status(500).json({ error: 'Failed to delete recipe' });
        }
    }
}

module.exports = RecipeController;
