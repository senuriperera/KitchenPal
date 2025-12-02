const RecipeModel = require('../models/Recipe');

class RecipeController {
    // Get all recipes for a branch
    static async getAllRecipes(req, res) {
        try {
            const { branch_id } = req.params;
            const { is_generated } = req.query;

            let isGeneratedFilter = null;
            if (is_generated !== undefined) {
                isGeneratedFilter = is_generated === 'true';
            }

            const recipes = await RecipeModel.getAllByBranch(branch_id, isGeneratedFilter);

            res.json({ recipes });
        } catch (error) {
            console.error('Get recipes error:', error);
            res.status(500).json({ error: 'Failed to fetch recipes' });
        }
    }

    // Get recipe by ID with full details
    static async getRecipeById(req, res) {
        try {
            const { id } = req.params;
            const recipe = await RecipeModel.findById(id);

            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            res.json({ recipe });
        } catch (error) {
            console.error('Get recipe error:', error);
            res.status(500).json({ error: 'Failed to fetch recipe' });
        }
    }

    // Create new recipe
    static async createRecipe(req, res) {
        try {
            const {
                branch_id,
                name,
                image_url,
                cooking_time_minutes,
                description,
                base_price,
                is_generated,
                ingredients,
                steps,
                images,
            } = req.body;

            // Create recipe
            const recipe = await RecipeModel.create({
                branch_id,
                name,
                image_url,
                cooking_time_minutes,
                description,
                base_price,
                is_generated: is_generated || false,
                created_by: req.user.user_id,
            });

            // Add ingredients
            if (ingredients && Array.isArray(ingredients)) {
                for (const ingredient of ingredients) {
                    await RecipeModel.addIngredient({
                        recipe_id: recipe.recipe_id,
                        ingredient_id: ingredient.ingredient_id,
                        quantity_required: ingredient.quantity_required,
                        unit_id: ingredient.unit_id,
                    });
                }
            }

            // Add steps
            if (steps && Array.isArray(steps)) {
                for (let i = 0; i < steps.length; i++) {
                    await RecipeModel.addStep({
                        recipe_id: recipe.recipe_id,
                        step_number: i + 1,
                        instruction: steps[i],
                    });
                }
            }

            // Add additional images
            if (images && Array.isArray(images)) {
                for (const image of images) {
                    await RecipeModel.addImage({
                        recipe_id: recipe.recipe_id,
                        image_url: image.url,
                        caption: image.caption,
                    });
                }
            }

            // Fetch complete recipe
            const completeRecipe = await RecipeModel.findById(recipe.recipe_id);

            res.status(201).json({
                message: 'Recipe created successfully',
                recipe: completeRecipe,
            });
        } catch (error) {
            console.error('Create recipe error:', error);
            res.status(500).json({ error: 'Failed to create recipe' });
        }
    }

    // Update recipe
    static async updateRecipe(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const recipe = await RecipeModel.update(id, updates);

            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            res.json({
                message: 'Recipe updated successfully',
                recipe,
            });
        } catch (error) {
            console.error('Update recipe error:', error);
            res.status(500).json({ error: 'Failed to update recipe' });
        }
    }

    // Delete recipe
    static async deleteRecipe(req, res) {
        try {
            const { id } = req.params;
            await RecipeModel.delete(id);

            res.json({ message: 'Recipe deleted successfully' });
        } catch (error) {
            console.error('Delete recipe error:', error);
            res.status(500).json({ error: 'Failed to delete recipe' });
        }
    }

    // Find matching recipes for given ingredients
    static async findMatchingRecipes(req, res) {
        try {
            const { branch_id } = req.params;
            const { ingredient_ids } = req.body;

            if (!Array.isArray(ingredient_ids) || ingredient_ids.length === 0) {
                return res.status(400).json({ error: 'ingredient_ids array is required' });
            }

            const recipes = await RecipeModel.findMatchingRecipes(branch_id, ingredient_ids);

            res.json({ recipes });
        } catch (error) {
            console.error('Find matching recipes error:', error);
            res.status(500).json({ error: 'Failed to find matching recipes' });
        }
    }
}

module.exports = RecipeController;
