const express = require('express');
const router = express.Router();
const RecipeSuggestionController = require('../controllers/recipeSuggestionController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const generateSuggestionValidation = [
    body('branch_id').isInt().withMessage('Valid branch_id is required'),
    body('ingredient_ids').isArray({ min: 1 }).withMessage('At least one ingredient_id is required'),
    validate,
];

// Routes
router.get('/branch/:branch_id', authenticate, RecipeSuggestionController.getAllSuggestions);
router.get('/:id', authenticate, RecipeSuggestionController.getSuggestionById);
router.post('/generate', authenticate, generateSuggestionValidation, RecipeSuggestionController.generateSuggestion);
router.put('/:id/approve', authenticate, authorize('admin', 'branch_manager'), RecipeSuggestionController.approveSuggestion);
router.put('/:id/reject', authenticate, authorize('admin', 'branch_manager'), RecipeSuggestionController.rejectSuggestion);
router.put('/:id/discount', authenticate, authorize('admin', 'branch_manager'), RecipeSuggestionController.updateSuggestionDiscount);
router.delete('/:id', authenticate, RecipeSuggestionController.deleteSuggestion);

module.exports = router;
