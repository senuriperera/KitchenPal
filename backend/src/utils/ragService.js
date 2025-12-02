const axios = require('axios');
const config = require('../config/config');

/**
 * RAG Service for intelligent recipe suggestions and discount calculations
 * This is a placeholder implementation. Replace with your actual RAG model integration.
 */

/**
 * Generate recipe suggestion using RAG model
 */
async function generateRecipeSuggestion(expiring_ingredients, available_recipes) {
    try {
        // If RAG API is configured, use it
        if (config.rag.apiUrl && config.rag.apiKey) {
            const response = await axios.post(
                `${config.rag.apiUrl}/suggest`,
                {
                    expiring_ingredients,
                    available_recipes,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.rag.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000, // 10 seconds
                }
            );

            return response.data;
        }

        // Fallback: Simple matching algorithm
        return fallbackRecipeSuggestion(expiring_ingredients, available_recipes);
    } catch (error) {
        console.error('RAG service error:', error.message);

        // Fallback to simple algorithm
        return fallbackRecipeSuggestion(expiring_ingredients, available_recipes);
    }
}

/**
 * Fallback recipe suggestion algorithm
 */
function fallbackRecipeSuggestion(expiring_ingredients, available_recipes) {
    // Simple scoring: Recipe with most matching ingredients wins
    const scoredRecipes = available_recipes.map(recipe => {
        const recipeIngredientIds = recipe.ingredients.map(ing => ing.ingredient_id);
        const matchCount = expiring_ingredients.filter(id =>
            recipeIngredientIds.includes(id)
        ).length;

        return {
            recipe,
            score: matchCount,
            match_percentage: (matchCount / recipeIngredientIds.length) * 100,
        };
    });

    // Sort by score (highest first)
    scoredRecipes.sort((a, b) => b.score - a.score);

    return {
        suggested_recipe: scoredRecipes[0]?.recipe || null,
        score: scoredRecipes[0]?.score || 0,
        match_percentage: scoredRecipes[0]?.match_percentage || 0,
        all_suggestions: scoredRecipes.slice(0, 5),
    };
}

/**
 * Get discount recommendation from RAG model
 */
async function getDiscountRecommendation(recipe, expiring_ingredients, urgency_level) {
    try {
        if (config.rag.apiUrl && config.rag.apiKey) {
            const response = await axios.post(
                `${config.rag.apiUrl}/discount`,
                {
                    recipe,
                    expiring_ingredients,
                    urgency_level,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.rag.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );

            return response.data;
        }

        // Fallback to simple calculation
        return null;
    } catch (error) {
        console.error('RAG discount recommendation error:', error.message);
        return null;
    }
}

module.exports = {
    generateRecipeSuggestion,
    getDiscountRecommendation,
};
