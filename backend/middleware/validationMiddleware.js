const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware that checks for validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * Common validation rules
 */
const validators = {
    // Tournament validation
    tournamentName: () => body('name')
        .trim()
        .notEmpty().withMessage('Tournament name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),

    organizerName: () => body('organizerName')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Organizer name must be 1-100 characters'),

    // Player validation
    playerName: () => body('name')
        .trim()
        .notEmpty().withMessage('Player name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),

    playerMobile: () => body('mobile')
        .trim()
        .matches(/^\d{10}$/).withMessage('Mobile must be 10 digits'),

    playerEmail: () => body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Invalid email format'),

    // Team validation
    teamName: () => body('name')
        .trim()
        .notEmpty().withMessage('Team name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),

    // ID validation
    mongoId: (paramName = 'id') => param(paramName)
        .matches(/^[0-9a-fA-F]{24}$/).withMessage(`Invalid ${paramName} format`),

    // Tournament ID in query
    tournamentIdQuery: () => query('tournamentId')
        .optional()
        .matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid tournamentId format'),

    // Budget validation
    budget: () => body('baseBudget')
        .isInt({ min: 0 }).withMessage('Budget must be a positive number'),

    // URL validation
    url: (fieldName = 'url') => body(fieldName)
        .optional()
        .trim()
        .isURL().withMessage(`${fieldName} must be a valid URL`),

    // File type validation
    fileType: () => body('fileType')
        .optional()
        .isIn(['image/jpeg', 'image/png', 'image/webp'])
        .withMessage('File type must be JPEG, PNG, or WebP'),
};

module.exports = {
    handleValidationErrors,
    validators
};
