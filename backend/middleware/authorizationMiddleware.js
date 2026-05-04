/**
 * Check if user has required role
 * Usage: router.post('/', authorize(['admin']), handler)
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        // User must be authenticated (authMiddleware should run first)
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized: Authentication required'
            });
        }

        // Check if user's role is in allowed roles
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Forbidden: Insufficient permissions',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Verify user owns the resource (tournaments/teams they created)
 */
const verifyResourceOwnership = async (req, res, next) => {
    try {
        const resourceId = req.params.id || req.params.tournamentId;
        const userId = req.user.id;

        // This will be implemented in each route with specific model checks
        // For now, pass to route handler which will verify ownership
        next();
    } catch (err) {
        res.status(500).json({ message: 'Authorization check failed' });
    }
};

module.exports = {
    authorize,
    verifyResourceOwnership
};
