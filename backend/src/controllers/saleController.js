const SaleModel = require('../models/Sale');

class SaleController {
    // Create new sale
    static async createSale(req, res) {
        try {
            const { recipe_id, generated_id, quantity_sold } = req.body;
            const branch_id = req.user.branch_id;
            const sold_by = req.user.user_id;

            const sale = await SaleModel.create({
                branch_id,
                recipe_id,
                generated_id: generated_id || null,
                quantity_sold: quantity_sold || 1,
                sold_by,
            });

            res.status(201).json({
                message: 'Sale recorded successfully',
                sale,
            });
        } catch (error) {
            console.error('Create sale error:', error);

            if (error.code === 'INSUFFICIENT_STOCK') {
                return res.status(400).json({
                    error: 'insufficient_stock',
                    details: error.details,
                });
            }

            if (error.message.includes('Recipe not found') || error.message.includes('not active')) {
                return res.status(404).json({ error: error.message });
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