const DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitize string input to prevent XSS
 */
const sanitizeString = (input) => {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Skip certain technical fields
        if (['_id', '__v', 'password', 'token'].includes(key)) {
            continue;
        }
        sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
};

/**
 * Validate URL is from allowed sources (prevent SSRF)
 */
const validateImageUrl = (url) => {
    try {
        const parsed = new URL(url);

        // Whitelist allowed domains
        const allowedDomains = [
            'drive.google.com',
            's3.amazonaws.com',
            'auction-platform-kp.s3.ap-south-1.amazonaws.com'
        ];

        // Check if domain matches whitelist
        const isAllowed = allowedDomains.some(domain =>
            parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            throw new Error(`Domain not whitelisted: ${parsed.hostname}`);
        }

        return true;
    } catch (err) {
        throw new Error(`Invalid or unauthorized URL: ${err.message}`);
    }
};

/**
 * Remove sensitive fields from response
 */
const removeSensitiveFields = (obj, fieldsToRemove = []) => {
    const defaultSensitiveFields = [
        'password',
        'token',
        'refreshToken',
        'secret',
        'apiKey',
        'AWS_ACCESS_KEY',
        'AWS_SECRET_KEY'
    ];

    const fieldsToDelete = [...defaultSensitiveFields, ...fieldsToRemove];

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeSensitiveFields(item, fieldsToRemove));
    }

    const cleaned = { ...obj };
    fieldsToDelete.forEach(field => {
        delete cleaned[field];
    });

    return cleaned;
};

module.exports = {
    sanitizeString,
    sanitizeObject,
    validateImageUrl,
    removeSensitiveFields
};
