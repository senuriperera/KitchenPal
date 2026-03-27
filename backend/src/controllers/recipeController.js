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
            const { name, image_url, cooking_time_minutes, description, base_price, ingredients, total_servings, serving_description } = req.body;

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
                created_by,
                total_servings: total_servings || 1,
                serving_description: serving_description || null,
            };

            const recipe = await Recipe.createStandardRecipe(recipeData, ingredients);

            res.status(201).json({
                message: 'Recipe created successfully',
                recipe
            });

            // Fetch full recipe with ingredients for the WebSocket payload
            const io = req.app.get('io');
            if (io) {
                const fullRecipe = await Recipe.getStandardRecipeById(recipe.recipe_id);
                if (fullRecipe) io.emit('recipe:created', fullRecipe);
            }
        } catch (error) {
            console.error('Create recipe error:', error);

            // Handle specific database errors
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Recipe with this name already exists' });
            }
            if (error.code === '23503') { // Foreign key violation
                return res.status(400).json({ error: 'Invalid ingredient or unit ID' });
            }

            // Surface explicit status codes thrown from model (unit mismatch = 400)
            if (error.statusCode) {
                return res.status(error.statusCode).json({ error: error.message });
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
            const { name, image_url, cooking_time_minutes, description, base_price, ingredients, total_servings, serving_description } = req.body;

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
                base_price,
                total_servings: total_servings || 1,
                serving_description: serving_description || null,
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

            // Fetch full recipe with ingredients for the WebSocket payload
            const io = req.app.get('io');
            if (io) {
                const fullRecipe = await Recipe.getStandardRecipeById(recipe.recipe_id);
                if (fullRecipe) io.emit('recipe:updated', fullRecipe);
            }
        } catch (error) {
            console.error('Update recipe error:', error);

            // Surface explicit status codes thrown from model (unit mismatch = 400, inactive = 404)
            if (error.statusCode) {
                return res.status(error.statusCode).json({ error: error.message });
            }

            // Handle specific database errors
            if (error.code === '23503') { // Foreign key violation
                return res.status(400).json({ error: 'Invalid ingredient or unit ID' });
            }

            res.status(500).json({ error: 'Failed to update recipe' });
        }
    }

    /**
     * Delete a recipe (soft delete — sets is_active = false)
     * DELETE /api/recipes/:id
     */
    static async deleteRecipe(req, res) {
        try {
            const { id } = req.params;
            const recipe = await Recipe.delete(id);

            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found or already inactive' });
            }

            res.json({ message: 'Recipe deleted successfully' });

            // Emit WebSocket event for real-time update
            const io = req.app.get('io');
            if (io) io.emit('recipe:deleted', { id: Number(id) });
        } catch (error) {
            console.error('Delete recipe error:', error);
            res.status(500).json({ error: 'Failed to delete recipe' });
        }
    }

    /**
     * Check recipe availability based on current stock
     * GET /api/recipes/availability
     * Returns which recipes can be made with current stock
     */
    static async checkAvailability(req, res) {
        try {
            const branch_id = req.user.branch_id;
            const db = require('../config/database');

            // Fetch all recipe ingredients with their required quantities and available stock
            const query = `
                SELECT
                    ri.recipe_id,
                    ri.master_ingredient_id,
                    ri.quantity_required,
                    ri.is_optional,
                    u.to_base_factor,
                    mi.name AS ingredient_name,
                    COALESCE(si.total_base_quantity, 0) AS available_base_quantity,
                    r.total_servings
                FROM recipe_ingredients ri
                JOIN units u ON ri.unit_id = u.unit_id
                JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
                JOIN recipes r ON ri.recipe_id = r.recipe_id
                LEFT JOIN stock_ingredients si
                    ON si.master_ingredient_id = ri.master_ingredient_id
                    AND si.branch_id = $1
                WHERE r.is_active = true
                AND (r.branch_id = $1 OR r.branch_id IS NULL)
                ORDER BY ri.recipe_id
            `;

            const result = await db.query(query, [branch_id]);

            // Group by recipe_id and check availability
            const recipeMap = {};

            for (const row of result.rows) {
                const recipeId = row.recipe_id;

                if (!recipeMap[recipeId]) {
                    recipeMap[recipeId] = {
                        available: true,
                        short_ingredients: [],
                    };
                }

                // Skip optional ingredients
                if (row.is_optional) continue;

                // Calculate required base quantity (for 1 full recipe = total_servings)
                const required_base = parseFloat(row.quantity_required) * parseFloat(row.to_base_factor);
                const available_base = parseFloat(row.available_base_quantity);

                // Check if sufficient stock exists
                if (available_base < required_base) {
                    recipeMap[recipeId].available = false;
                    recipeMap[recipeId].short_ingredients.push(row.ingredient_name);
                }
            }

            res.json({ availability: recipeMap });
        } catch (error) {
            console.error('Check availability error:', error);
            res.status(500).json({ error: 'Failed to check availability' });
        }
    }
}

module.exports = RecipeController;
