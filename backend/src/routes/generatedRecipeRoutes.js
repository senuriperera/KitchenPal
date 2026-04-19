const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
    createGeneratedRecipe,
    getGeneratedRecipesForBranch,
    getPendingGeneratedRecipes,
    approveGeneratedRecipe,
    rejectGeneratedRecipe,
    getRecentlyApprovedRecipes,
    getRecentlyRejectedRecipes,
    getGeneratedRecipeIngredients,
} = require('../controllers/generatedRecipeController');

// Staff: save chosen recipe as generated (pending)
// Any authenticated branch user can trigger this; branch_id and user_id
// still come strictly from the JWT in the controller.
router.post('/', authenticate, createGeneratedRecipe);

// Staff: list generated recipes for their branch
router.get('/', authenticate, getGeneratedRecipesForBranch);

// Admin: list all pending generated recipes for discount approvals
router.get('/pending', authenticate, authorize('admin'), getPendingGeneratedRecipes);

// Admin: list recently approved generated recipes
router.get('/recently-approved', authenticate, authorize('admin'), getRecentlyApprovedRecipes);

// Admin: list recently rejected generated recipes
router.get('/recently-rejected', authenticate, authorize('admin'), getRecentlyRejectedRecipes);

// Get ingredients for a generated recipe
router.get('/:id/ingredients', authenticate, getGeneratedRecipeIngredients);

// Admin: approve generated recipe
router.put('/:id/approve', authenticate, authorize('admin'), approveGeneratedRecipe);

// Admin: reject generated recipe
router.put('/:id/reject', authenticate, authorize('admin'), rejectGeneratedRecipe);

module.exports = router;
