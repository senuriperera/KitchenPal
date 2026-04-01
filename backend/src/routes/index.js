const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const ingredientRoutes = require('./ingredientRoutes');
const masterIngredientRoutes = require('./masterIngredientRoutes');
const notificationRoutes = require('./notificationRoutes');
const recipeSuggestionRoutes = require('./recipeSuggestionRoutes');
const recipeRoutes = require('./recipeRoutes');
const generatedRecipeRoutes = require('./generatedRecipeRoutes');
const saleRoutes = require('./saleRoutes');
const commonRoutes = require('./commonRoutes');
const userRoutes = require('./userRoutes');
const uploadRoutes = require('./uploadRoutes');
const adminRoutes = require('./adminRoutes');

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/master-ingredients', masterIngredientRoutes);
router.use('/notifications', notificationRoutes);
router.use('/suggestions', recipeSuggestionRoutes);
router.use('/recipes', recipeRoutes);
router.use('/generated-recipes', generatedRecipeRoutes);
router.use('/sales', saleRoutes);
router.use('/common', commonRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
