const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 */
const generateToken = (userId, email, role = 'user') => {
    return jwt.sign(
        {
            userId,
            email,
            role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRY || '7d'
        }
    );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

/**
 * Decode token without verification (for debugging only)
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (err) {
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken
};
