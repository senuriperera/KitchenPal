const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/saleController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createSaleValidation = [
    body('branch_id').isInt().withMessage('Valid branch_id is required'),
    body('recipe_id').isInt().withMessage('Valid recipe_id is required'),
    body('quantity_sold').isInt({ min: 1 }).withMessage('Quantity sold must be at least 1'),
    validate,
];

// Routes
router.get('/branch/:branch_id', authenticate, SaleController.getAllSales);
router.get('/branch/:branch_id/statistics', authenticate, SaleController.getSalesStatistics);
router.get('/:id', authenticate, SaleController.getSaleById);
router.post('/', authenticate, createSaleValidation, SaleController.createSale);
router.delete('/:id', authenticate, SaleController.deleteSale);

module.exports = router;
