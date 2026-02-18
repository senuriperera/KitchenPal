const RecipeModel = require('../models/Recipe');
const IngredientModel = require('../models/Ingredient');

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
                    let ingredientId = ingredient.ingredient_id;

                    // If ingredient_name is provided instead of ingredient_id, find or create the ingredient
                    if (!ingredientId && ingredient.ingredient_name) {
                        // Try to find existing ingredient by name
                        const existingIngredient = await IngredientModel.findByNameAndBranch(
                            ingredient.ingredient_name,
                            branch_id
                        );

                        if (existingIngredient) {
                            ingredientId = existingIngredient.ingredient_id;
                        } else {
                            // Create new ingredient with minimal data
                            const newIngredient = await IngredientModel.create({
                                branch_id,
                                name: ingredient.ingredient_name,
                                quantity: 0,
                                unit_id: ingredient.unit_id || null,
                                price: 0,
                                expiry_date: null,
                                manufacture_date: null,
                                storage_type_id: null,
                                image_url: null,
                            });
                            ingredientId = newIngredient.ingredient_id;
                        }
                    }

                    if (ingredientId) {
                        await RecipeModel.addIngredient({
                            recipe_id: recipe.recipe_id,
                            ingredient_id: ingredientId,
                            quantity_required: ingredient.quantity_required,
                            unit_id: ingredient.unit_id,
                        });
                    }
                }
            }

            // Fetch complete recipe
            const completeRecipe = await RecipeModel.findById(recipe.recipe_id);

            res.status(201).json({
                message: 'Recipe created successfully',
                recipe: completeRecipe,
            });
        } catch (error) {
            console.error('Create recipe error:', error.message);
            console.error('Error detail:', error.detail);
            console.error('Error code:', error.code);
            console.error('Error stack:', error.stack);
            res.status(500).json({ error: 'Failed to create recipe', detail: error.message });
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
