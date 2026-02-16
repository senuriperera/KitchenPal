const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const ingredientRoutes = require('./ingredientRoutes');
const recipeRoutes = require('./recipeRoutes');
const notificationRoutes = require('./notificationRoutes');
const recipeSuggestionRoutes = require('./recipeSuggestionRoutes');
const saleRoutes = require('./saleRoutes');
const commonRoutes = require('./commonRoutes');
const userRoutes = require('./userRoutes');
const uploadRoutes = require('./uploadRoutes');

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/recipes', recipeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/suggestions', recipeSuggestionRoutes);
router.use('/sales', saleRoutes);
router.use('/common', commonRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
