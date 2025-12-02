const SaleModel = require('../models/Sale');
const RecipeModel = require('../models/Recipe');

class SaleController {
    // Create new sale
    static async createSale(req, res) {
        try {
            const {
                branch_id,
                recipe_id,
                suggestion_id,
                discount_id,
                quantity_sold,
                notes,
            } = req.body;

            // Get recipe details
            const recipe = await RecipeModel.findById(recipe_id);

            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            // Calculate prices
            const base_price_per_unit = parseFloat(recipe.base_price);
            let final_price_per_unit = base_price_per_unit;

            // If there's a discount, fetch it
            if (discount_id) {
                const DiscountModel = require('../models/Discount');
                const discount = await DiscountModel.findById(discount_id);

                if (discount) {
                    final_price_per_unit = parseFloat(discount.final_discounted_price);
                }
            }

            const total_revenue = final_price_per_unit * quantity_sold;
            const recipe_type = recipe.is_generated ? 'generated' : 'standard';

            // Create sale and deduct inventory
            const sale = await SaleModel.create({
                branch_id,
                recipe_id,
                suggestion_id,
                discount_id,
                quantity_sold,
                base_price_per_unit,
                final_price_per_unit,
                total_revenue,
                recipe_type,
                sold_by_user_id: req.user.user_id,
                notes,
            });

            res.status(201).json({
                message: 'Sale created successfully and inventory deducted',
                sale,
            });
        } catch (error) {
            console.error('Create sale error:', error);

            if (error.message.includes('Insufficient quantity')) {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Failed to create sale' });
        }
    }

    // Get all sales for a branch
    static async getAllSales(req, res) {
        try {
            const { branch_id } = req.params;
            const { recipe_type, start_date, end_date } = req.query;

            const filters = {};

            if (recipe_type) filters.recipe_type = recipe_type;
            if (start_date) filters.start_date = start_date;
            if (end_date) filters.end_date = end_date;

            const sales = await SaleModel.getAllByBranch(branch_id, filters);

            res.json({ sales });
        } catch (error) {
            console.error('Get sales error:', error);
            res.status(500).json({ error: 'Failed to fetch sales' });
        }
    }

    // Get sale by ID
    static async getSaleById(req, res) {
        try {
            const { id } = req.params;
            const sale = await SaleModel.findById(id);

            if (!sale) {
                return res.status(404).json({ error: 'Sale not found' });
            }

            res.json({ sale });
        } catch (error) {
            console.error('Get sale error:', error);
            res.status(500).json({ error: 'Failed to fetch sale' });
        }
    }

    // Get sales statistics
    static async getSalesStatistics(req, res) {
        try {
            const { branch_id } = req.params;
            const { start_date, end_date } = req.query;

            const startDate = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endDate = end_date || new Date();

            const statistics = await SaleModel.getStatistics(branch_id, startDate, endDate);

            res.json({ statistics });
        } catch (error) {
            console.error('Get sales statistics error:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    }

    // Delete sale
    static async deleteSale(req, res) {
        try {
            const { id } = req.params;
            await SaleModel.delete(id);

            res.json({ message: 'Sale deleted successfully' });
        } catch (error) {
            console.error('Delete sale error:', error);
            res.status(500).json({ error: 'Failed to delete sale' });
        }
    }
}

module.exports = SaleController;
