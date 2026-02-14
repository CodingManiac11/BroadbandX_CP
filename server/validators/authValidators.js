const Joi = require('joi');

/**
 * Password strength regex:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (@$!%*?&)
 */
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordMessage = 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';

// Joi validation schemas
const schemas = {
    register: Joi.object({
        firstName: Joi.string().trim().min(1).max(50).required()
            .messages({ 'string.empty': 'First name is required' }),
        lastName: Joi.string().trim().min(1).max(50).required()
            .messages({ 'string.empty': 'Last name is required' }),
        email: Joi.string().email().lowercase().required()
            .messages({ 'string.email': 'Please enter a valid email address' }),
        password: Joi.string().pattern(passwordPattern).required()
            .messages({ 'string.pattern.base': passwordMessage }),
        phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required()
            .messages({ 'string.pattern.base': 'Please enter a valid phone number' }),
        address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().default('USA')
        }).required(),
        role: Joi.string().valid('customer').default('customer')
    }),

    login: Joi.object({
        email: Joi.string().email().lowercase().required()
            .messages({ 'string.email': 'Please enter a valid email address' }),
        password: Joi.string().required()
            .messages({ 'string.empty': 'Password is required' }),
        role: Joi.string().valid('customer', 'admin').optional()
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required()
            .messages({ 'string.empty': 'Current password is required' }),
        newPassword: Joi.string().pattern(passwordPattern).required()
            .messages({ 'string.pattern.base': passwordMessage })
    }),

    resetPassword: Joi.object({
        password: Joi.string().pattern(passwordPattern).required()
            .messages({ 'string.pattern.base': passwordMessage })
    }),

    forgotPassword: Joi.object({
        email: Joi.string().email().lowercase().required()
            .messages({ 'string.email': 'Please enter a valid email address' })
    }),

    updateProfile: Joi.object({
        firstName: Joi.string().trim().min(1).max(50).optional(),
        lastName: Joi.string().trim().min(1).max(50).optional(),
        phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
            .messages({ 'string.pattern.base': 'Please enter a valid phone number' }),
        address: Joi.object({
            street: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            zipCode: Joi.string().optional(),
            country: Joi.string().optional()
        }).optional(),
        preferences: Joi.object({
            notifications: Joi.object({
                email: Joi.boolean().optional(),
                sms: Joi.boolean().optional(),
                push: Joi.boolean().optional()
            }).optional(),
            dataUsageAlerts: Joi.object({
                enabled: Joi.boolean().optional(),
                threshold: Joi.number().min(0).max(100).optional()
            }).optional()
        }).optional(),
        dateOfBirth: Joi.date().optional()
    })
};

/**
 * Middleware factory that validates request body against a Joi schema
 * @param {string} schemaName - Name of the schema to validate against
 */
const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            return next(new Error(`Validation schema '${schemaName}' not found`));
        }

        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true, // Remove unknown fields
            allowUnknown: false
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, '')
            }));

            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors
            });
        }

        // Replace req.body with validated & sanitized values
        req.body = value;
        next();
    };
};

module.exports = { validate, schemas };
