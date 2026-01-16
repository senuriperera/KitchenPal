const express = require('express');
const router = express.Router();
const IngredientController = require('../controllers/ingredientController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createIngredientValidation = [
    body('branch_id').isInt().withMessage('Valid branch_id is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
    body('unit_id').isInt().withMessage('Valid unit_id is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    body('weight_unit_id').optional().isInt().withMessage('Valid weight_unit_id is required'),
    body('expiry_date').isISO8601().withMessage('Valid expiry date is required'),
    body('storage_type_id').isInt().withMessage('Valid storage_type_id is required'),
    validate,
];

// Routes
router.get('/branch/:branch_id', authenticate, IngredientController.getAllIngredients);
router.get('/branch/:branch_id/expiring', authenticate, IngredientController.getExpiringIngredients);
router.get('/branch/:branch_id/stats', authenticate, IngredientController.getMonthlyStats);
router.get('/:id', authenticate, IngredientController.getIngredientById);
router.post('/', authenticate, createIngredientValidation, IngredientController.createIngredient);
router.post('/scan', authenticate, IngredientController.scanIngredient);

router.put('/:id', authenticate, IngredientController.updateIngredient);
router.delete('/:id', authenticate, IngredientController.deleteIngredient);

module.exports = router;
