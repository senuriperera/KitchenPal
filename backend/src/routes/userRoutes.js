const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createUserValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'manager', 'staff']).withMessage('Invalid role'),
    validate,
];

const updateUserValidation = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'manager', 'staff']).withMessage('Invalid role'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
];

// All routes require authentication and appropriate role
// Managers can view users from their branch, admins can view all

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), UserController.getAllUsers);
router.post('/', authenticate, requireRole(['admin']), createUserValidation, UserController.createUser);
router.put('/:id', authenticate, requireRole(['admin']), updateUserValidation, UserController.updateUser);
router.delete('/:id', authenticate, requireRole(['admin']), UserController.deleteUser);

module.exports = router;
