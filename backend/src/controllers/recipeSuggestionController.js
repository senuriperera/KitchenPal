const RecipeSuggestionModel = require('../models/RecipeSuggestion');
const RecipeModel = require('../models/Recipe');
const DiscountModel = require('../models/Discount');
const { calculateDiscount } = require('../utils/discountCalculator');

class RecipeSuggestionController {
    // Generate recipe suggestion from expiring ingredients
    static async generateSuggestion(req, res) {
        try {
            const { branch_id, ingredient_ids, notification_id } = req.body;

            if (!Array.isArray(ingredient_ids) || ingredient_ids.length === 0) {
                return res.status(400).json({ error: 'ingredient_ids array is required' });
            }

            // Find matching recipes
            const matchingRecipes = await RecipeModel.findMatchingRecipes(branch_id, ingredient_ids);

            if (matchingRecipes.length === 0) {
                return res.status(404).json({ error: 'No matching recipes found' });
            }

            // Select the best recipe (first one with most matches)
            const selectedRecipe = matchingRecipes[0];

            // Get full recipe details
            const recipe = await RecipeModel.findById(selectedRecipe.recipe_id);

            // Calculate discount using RAG model or fallback
            const discountData = await calculateDiscount(recipe, ingredient_ids);

            // Create recipe suggestion
            const suggestion = await RecipeSuggestionModel.create({
                branch_id,
                notification_id,
                recipe_id: recipe.recipe_id,
                expiring_ingredients: ingredient_ids,
                suggested_discount_percentage: discountData.discount_percentage,
                calculated_discounted_price: discountData.discounted_price,
                urgency_level: discountData.urgency_level,
            });

            // Fetch complete suggestion
            const completeSuggestion = await RecipeSuggestionModel.findById(suggestion.suggestion_id);

            res.status(201).json({
                message: 'Recipe suggestion generated successfully',
                suggestion: completeSuggestion,
                recipe,
            });
        } catch (error) {
            console.error('Generate suggestion error:', error);
            res.status(500).json({ error: 'Failed to generate recipe suggestion' });
        }
    }

    // Get all suggestions for a branch
    static async getAllSuggestions(req, res) {
        try {
            const { branch_id } = req.params;
            const { status } = req.query;

            const suggestions = await RecipeSuggestionModel.getAllByBranch(branch_id, status);

            res.json({ suggestions });
        } catch (error) {
            console.error('Get suggestions error:', error);
            res.status(500).json({ error: 'Failed to fetch suggestions' });
        }
    }

    // Fetch a single suggestion by its ID, along with the recipe details
    static async getSuggestionById(req, res) {
        try {
            const { id } = req.params;
            const suggestion = await RecipeSuggestionModel.findById(id);

            if (!suggestion) {
                return res.status(404).json({ error: 'Suggestion not found' });
            }

            // Get full recipe details
            const recipe = await RecipeModel.findById(suggestion.recipe_id);

            res.json({ suggestion, recipe });
        } catch (error) {
            console.error('Get suggestion error:', error);
            res.status(500).json({ error: 'Failed to fetch suggestion' });
        }
    }

    // Approve suggestion and create discount
    static async approveSuggestion(req, res) {
        try {
            const { id } = req.params;
            const { admin_discount_percentage, admin_notes } = req.body;

            const suggestion = await RecipeSuggestionModel.findById(id);

            if (!suggestion) {
                return res.status(404).json({ error: 'Suggestion not found' });
            }

            // Calculate final price if admin modified discount
            let finalDiscount = suggestion.suggested_discount_percentage;
            let finalPrice = suggestion.calculated_discounted_price;

            if (admin_discount_percentage !== undefined) {
                finalDiscount = admin_discount_percentage;
                finalPrice = suggestion.base_price * (1 - finalDiscount / 100);
            }

            // Approve suggestion
            const approvedSuggestion = await RecipeSuggestionModel.approve(id, req.user.user_id);

            // Create discount record
            const discount = await DiscountModel.create({
                suggestion_id: id,
                branch_id: suggestion.branch_id,
                original_price: suggestion.base_price,
                suggested_discount_percentage: suggestion.suggested_discount_percentage,
                admin_approved_discount_percentage: finalDiscount,
                final_discounted_price: finalPrice,
                approved_by_admin_id: req.user.user_id,
            });

            // Approve the discount automatically
            await DiscountModel.approve(
                discount.discount_id,
                req.user.user_id,
                finalDiscount,
                finalPrice,
                admin_notes
            );

            res.json({
                message: 'Suggestion approved successfully',
                suggestion: approvedSuggestion,
                discount,
            });
        } catch (error) {
            console.error('Approve suggestion error:', error);
            res.status(500).json({ error: 'Failed to approve suggestion' });
        }
    }

    // Reject suggestion
    static async rejectSuggestion(req, res) {
        try {
            const { id } = req.params;
            const { rejection_reason } = req.body;

            const suggestion = await RecipeSuggestionModel.reject(id, rejection_reason);

            if (!suggestion) {
                return res.status(404).json({ error: 'Suggestion not found' });
            }

            res.json({
                message: 'Suggestion rejected successfully',
                suggestion,
            });
        } catch (error) {
            console.error('Reject suggestion error:', error);
            res.status(500).json({ error: 'Failed to reject suggestion' });
        }
    }

    // Update discount for suggestion
    static async updateSuggestionDiscount(req, res) {
        try {
            const { id } = req.params;
            const { discount_percentage } = req.body;

            const suggestion = await RecipeSuggestionModel.findById(id);

            if (!suggestion) {
                return res.status(404).json({ error: 'Suggestion not found' });
            }

            const newPrice = suggestion.base_price * (1 - discount_percentage / 100);

            const updatedSuggestion = await RecipeSuggestionModel.updateDiscount(
                id,
                discount_percentage,
                newPrice
            );

            res.json({
                message: 'Suggestion discount updated successfully',
                suggestion: updatedSuggestion,
            });
        } catch (error) {
            console.error('Update suggestion discount error:', error);
            res.status(500).json({ error: 'Failed to update suggestion discount' });
        }
    }

    // Delete suggestion
    static async deleteSuggestion(req, res) {
        try {
            const { id } = req.params;
            await RecipeSuggestionModel.delete(id);

            res.json({ message: 'Suggestion deleted successfully' });
        } catch (error) {
            console.error('Delete suggestion error:', error);
            res.status(500).json({ error: 'Failed to delete suggestion' });
        }
    }
}

module.exports = RecipeSuggestionController;
