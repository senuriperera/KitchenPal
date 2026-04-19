const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/saleController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createSaleValidation = [
    body('recipe_id').isInt().withMessage('Valid recipe_id is required'),
    body('generated_id')
        .custom(value => value === null || Number.isInteger(value))
        .withMessage('generated_id must be null (for standard recipes) or an integer (for generated recipes)'),
    body('quantity_sold')
        .optional()
        .isInt({ min: 1 })
        .withMessage('quantity_sold must be at least 1'),
    validate,
];

// Routes
router.get('/branch/:branch_id', authenticate, SaleController.getAllSales);
router.get('/branch/:branch_id/statistics', authenticate, SaleController.getSalesStatistics);
router.get('/:id', authenticate, SaleController.getSaleById);
router.post('/', authenticate, createSaleValidation, SaleController.createSale);
router.delete('/:id', authenticate, SaleController.deleteSale);

module.exports = router;
