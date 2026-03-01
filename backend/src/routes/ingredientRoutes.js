const express = require('express');
const router = express.Router();
const IngredientController = require('../controllers/ingredientController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// ─── Validation ────────────────────────────────────────────────────────────────
const createIngredientValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('quantity_in_stock').isFloat({ min: 0 }).withMessage('quantity_in_stock must be ≥ 0'),
    body('unit_weight').isFloat({ min: 0 }).withMessage('unit_weight must be ≥ 0'),
    body('unit_weight_unit_id').isInt().withMessage('Valid unit_weight_unit_id is required'),
    body('price').isFloat({ min: 0 }).withMessage('price must be ≥ 0'),
    body('storage_type_id').isInt().withMessage('Valid storage_type_id is required'),
    body('expiry_date').isISO8601().withMessage('Valid expiry_date (ISO8601) is required'),
    body('manufacture_date').optional({ nullable: true }).isISO8601().withMessage('manufacture_date must be ISO8601'),
    body('image_url').optional({ nullable: true }).isString(),
    body('master_ingredient_id').optional({ nullable: true }).isInt(),
    validate,
];

// ─── Routes ────────────────────────────────────────────────────────────────────
// IMPORTANT: /scan and /expiring must be declared BEFORE /:ingredient_id
router.post('/scan', authenticate, IngredientController.scanIngredient);
router.get('/expiring', authenticate, IngredientController.getExpiringIngredients);

router.get('/', authenticate, IngredientController.getIngredients);
router.get('/:ingredient_id', authenticate, IngredientController.getIngredientById);
router.post('/', authenticate, createIngredientValidation, IngredientController.createIngredient);
router.delete('/:ingredient_id', authenticate, IngredientController.deleteIngredient);

module.exports = router;
