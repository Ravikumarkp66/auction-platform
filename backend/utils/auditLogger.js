const UserLog = require('../models/UserLog');

/**
 * Log important actions to database for audit trail
 */
const logAction = async (userId, action, resourceType, resourceId, details = {}) => {
    try {
        await UserLog.create({
            userId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress: details.ipAddress || 'unknown',
            userAgent: details.userAgent || 'unknown',
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Failed to log action:', err);
        // Don't throw - logging failures shouldn't break the app
    }
};

/**
 * Audit log wrapper middleware for routes
 */
const auditLog = (action, resourceType) => {
    return async (req, res, next) => {
        // Store original send for interception
        const originalSend = res.send;

        res.send = function (data) {
            // Check if request was successful (2xx status)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const resourceId = req.params.id || req.params.tournamentId || 'N/A';
                logAction(
                    req.user?.id,
                    action,
                    resourceType,
                    resourceId,
                    {
                        method: req.method,
                        path: req.path,
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                );
            }

            // Call the original send
            res.send = originalSend;
            return res.send(data);
        };

        next();
    };
};

module.exports = {
    logAction,
    auditLog
};
