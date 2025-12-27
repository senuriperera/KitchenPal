const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createUserValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'branch-manager', 'staff']).withMessage('Invalid role'),
    validate,
];

const updateUserValidation = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'branch-manager', 'staff']).withMessage('Invalid role'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
];

// All routes require authentication
// TODO: Add admin-only middleware for production

// Routes
router.get('/', authenticate, UserController.getAllUsers);
router.post('/', authenticate, createUserValidation, UserController.createUser);
router.put('/:id', authenticate, updateUserValidation, UserController.updateUser);
router.delete('/:id', authenticate, UserController.deleteUser);

module.exports = router;
