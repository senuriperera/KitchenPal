const express = require('express');
const router = express.Router();
const MasterIngredientController = require('../controllers/masterIngredientController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('default_unit_id').optional().isInt().withMessage('Valid unit_id is required'),
    body('is_custom').optional().isBoolean().withMessage('is_custom must be a boolean'),
    validate,
];

const findOrCreateValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('default_unit_id').optional().isInt().withMessage('Valid unit_id is required'),
    validate,
];

// Routes
router.get('/search', authenticate, MasterIngredientController.search);
router.get('/', authenticate, MasterIngredientController.getAll);
router.get('/:id', authenticate, MasterIngredientController.getById);
router.post('/', authenticate, createValidation, MasterIngredientController.create);
router.post('/find-or-create', authenticate, findOrCreateValidation, MasterIngredientController.findOrCreate);
router.put('/:id', authenticate, MasterIngredientController.update);
router.delete('/:id', authenticate, MasterIngredientController.delete);

module.exports = router;
