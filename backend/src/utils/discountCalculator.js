const IngredientModel = require('../models/Ingredient');

async function calculateDiscount(recipe, expiring_ingredient_ids) {
    try {
        const ingredients = await Promise.all(
            expiring_ingredient_ids.map(id => IngredientModel.findById(id))
        );

        const today = new Date();
        const expiryDates = ingredients.map(ing => {
            const expiryDate = new Date(ing.expiry_date);
            const diffTime = expiryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        });

        const minDaysUntilExpiry = Math.min(...expiryDates);

        let urgency_level = 'low';
        let discount_percentage = 0;

        if (minDaysUntilExpiry <= 1) {
            urgency_level = 'critical';
            discount_percentage = 50;
        } else if (minDaysUntilExpiry <= 2) {
            urgency_level = 'high';
            discount_percentage = 40;
        } else if (minDaysUntilExpiry <= 3) {
            urgency_level = 'high';
            discount_percentage = 30;
        } else if (minDaysUntilExpiry <= 5) {
            urgency_level = 'medium';
            discount_percentage = 20;
        } else {
            urgency_level = 'low';
            discount_percentage = 10;
        }

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

        return {
            discount_percentage: 15,
            discounted_price: parseFloat((recipe.base_price * 0.85).toFixed(2)),
            urgency_level: 'medium',
            min_days_until_expiry: null,
        };
    }
}

module.exports = { calculateDiscount };
