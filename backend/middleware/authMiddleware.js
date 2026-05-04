const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header
 * Format: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Unauthorized: No valid authorization header'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Unauthorized: Token missing'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Unauthorized: Token expired'
            });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Unauthorized: Invalid token'
            });
        }

        res.status(401).json({
            message: 'Unauthorized'
        });
    }
};

module.exports = authMiddleware;
