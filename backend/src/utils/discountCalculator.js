const IngredientModel = require('../models/Ingredient');

/**
 * Calculate discount based on expiring ingredients and urgency
 * This is a fallback function. In production, you would integrate with a RAG model.
 */
async function calculateDiscount(recipe, expiring_ingredient_ids) {
    try {
        // Get ingredient details
        const ingredients = await Promise.all(
            expiring_ingredient_ids.map(id => IngredientModel.findById(id))
        );

        // Calculate days until expiry
        const today = new Date();
        const expiryDates = ingredients.map(ing => {
            const expiryDate = new Date(ing.expiry_date);
            const diffTime = expiryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        });

        const minDaysUntilExpiry = Math.min(...expiryDates);

        // Calculate urgency level and discount percentage
        let urgency_level = 'low';
        let discount_percentage = 0;

        if (minDaysUntilExpiry <= 1) {
            urgency_level = 'critical';
            discount_percentage = 50; // 50% discount
        } else if (minDaysUntilExpiry <= 2) {
            urgency_level = 'high';
            discount_percentage = 40; // 40% discount
        } else if (minDaysUntilExpiry <= 3) {
            urgency_level = 'high';
            discount_percentage = 30; // 30% discount
        } else if (minDaysUntilExpiry <= 5) {
            urgency_level = 'medium';
            discount_percentage = 20; // 20% discount
        } else {
            urgency_level = 'low';
            discount_percentage = 10; // 10% discount
        }

        // Calculate discounted price
        const base_price = parseFloat(recipe.base_price);
        const discounted_price = base_price * (1 - discount_percentage / 100);

        return {
            discount_percentage,
            discounted_price: parseFloat(discounted_price.toFixed(2)),
            urgency_level,
            min_days_until_expiry: minDaysUntilExpiry,
        };
    } catch (error) {
        console.error('Calculate discount error:', error);

        // Fallback to default discount
        return {
            discount_percentage: 15,
            discounted_price: parseFloat((recipe.base_price * 0.85).toFixed(2)),
            urgency_level: 'medium',
            min_days_until_expiry: null,
        };
    }
}

module.exports = { calculateDiscount };
