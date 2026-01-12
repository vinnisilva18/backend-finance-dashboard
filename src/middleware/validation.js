const { body, param, query, validationResult } = require('express-validator');

const validateRequest = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    };
};

// Common validation rules
const transactionValidation = [
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Description must be between 1 and 200 characters'),
    body('date').isISO8601().withMessage('Invalid date format'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be either income or expense'),
    body('category').isMongoId().withMessage('Invalid category ID')
];

const userValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
];

const categoryValidation = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be either income or expense'),
    body('color').optional().isHexColor().withMessage('Invalid color format'),
    body('icon').optional().isString().withMessage('Icon must be a string')
];

const goalValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('targetAmount').isFloat({ min: 0 }).withMessage('Target amount must be a positive number'),
    body('currentAmount').optional().isFloat({ min: 0 }).withMessage('Current amount must be a positive number'),
    body('deadline').isISO8601().withMessage('Invalid date format'),
    body('color').optional().isHexColor().withMessage('Invalid color format')
];

module.exports = {
    validateRequest,
    transactionValidation,
    userValidation,
    categoryValidation,
    goalValidation
};