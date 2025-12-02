const express = require('express');
const router = express.Router();
const RecipeController = require('../controllers/recipeController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createRecipeValidation = [
    body('branch_id').isInt().withMessage('Valid branch_id is required'),
    body('name').trim().notEmpty().withMessage('Recipe name is required'),
    body('cooking_time_minutes').isInt({ min: 1 }).withMessage('Cooking time must be a positive integer'),
    body('base_price').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    validate,
];

// Routes
router.get('/branch/:branch_id', authenticate, RecipeController.getAllRecipes);
router.get('/:id', authenticate, RecipeController.getRecipeById);
router.post('/', authenticate, createRecipeValidation, RecipeController.createRecipe);
router.post('/branch/:branch_id/matching', authenticate, RecipeController.findMatchingRecipes);
router.put('/:id', authenticate, RecipeController.updateRecipe);
router.delete('/:id', authenticate, RecipeController.deleteRecipe);

module.exports = router;
