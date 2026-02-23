const express = require('express');
const router = express.Router();
const RecipeController = require('../controllers/recipeController');

// GET /api/recipes - Get all standard recipes with ingredients
router.get('/', RecipeController.getAllRecipes);

// GET /api/recipes/:id - Get single recipe by ID
router.get('/:id', RecipeController.getRecipeById);

// POST /api/recipes - Create new recipe with ingredients and keywords
router.post('/', RecipeController.createRecipe);

// PUT /api/recipes/:id - Update recipe
router.put('/:id', RecipeController.updateRecipe);

// DELETE /api/recipes/:id - Delete recipe (soft delete)
router.delete('/:id', RecipeController.deleteRecipe);

module.exports = router;
