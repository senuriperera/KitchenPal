const express = require('express');
const router = express.Router();
const RecipeController = require('../controllers/recipeController');
const authenticate = require('../middleware/auth');
const { generateRecipes } = require('../controllers/recipeGenerationController');

// GET /api/recipes - Get all standard recipes with ingredients (public)
router.get('/', RecipeController.getAllRecipes);

// GET /api/recipes/availability - Check recipe availability based on stock (auth required)
router.get('/availability', authenticate, RecipeController.checkAvailability);

// GET /api/recipes/:id - Get single recipe by ID (public)
router.get('/:id', RecipeController.getRecipeById);

// POST /api/recipes - Create new recipe with ingredients and keywords (auth required)
router.post('/', authenticate, RecipeController.createRecipe);

// PUT /api/recipes/:id - Update recipe (auth required)
router.put('/:id', authenticate, RecipeController.updateRecipe);

// DELETE /api/recipes/:id - Delete recipe (soft delete, auth required)
router.delete('/:id', authenticate, RecipeController.deleteRecipe);

// Jaccard-based recipe suggestions (does not persist)
router.post('/generate', authenticate, generateRecipes);

module.exports = router;
