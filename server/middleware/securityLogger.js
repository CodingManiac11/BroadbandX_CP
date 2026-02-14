const AuditLog = require('../models/AuditLog');

/**
 * Security Logger Middleware
 * Logs authentication and security events to the AuditLog collection.
 * Captures IP address, user agent, and action details for forensic analysis.
 */

/**
 * Log a security event to the audit trail
 * @param {Object} options - Event details
 * @param {string} options.action - The action performed (login, logout, register, etc.)
 * @param {string} options.entity - Entity type (always 'User' for auth events)
 * @param {string} options.entityId - The user's MongoDB ObjectId
 * @param {string} options.userId - The user's MongoDB ObjectId
 * @param {string} options.userEmail - The user's email
 * @param {string} options.userRole - The user's role (customer/admin)
 * @param {Object} options.req - Express request object (for IP and user agent)
 * @param {boolean} options.success - Whether the action succeeded
 * @param {string} [options.errorMessage] - Error message if action failed
 * @param {Object} [options.details] - Additional details about the event
 */
const logSecurityEvent = async ({
    action,
    entity = 'User',
    entityId,
    userId,
    userEmail,
    userRole = 'customer',
    req,
    success = true,
    errorMessage,
    details = {}
}) => {
    try {
        const ipAddress = req ?
            (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || 'unknown') :
            'unknown';
        const userAgent = req ? (req.headers['user-agent'] || 'unknown') : 'unknown';

        await AuditLog.logAction({
            entity,
            entityId: entityId || userId,
            action,
            userId,
            userEmail,
            userRole,
            ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : 'unknown',
            userAgent,
            success,
            errorMessage,
            details: {
                ...details,
                timestamp: new Date().toISOString(),
                endpoint: req ? `${req.method} ${req.originalUrl}` : 'unknown'
            }
        });

        console.log(`🔒 [AUDIT] ${action.toUpperCase()} | ${userEmail} | ${success ? '✅ Success' : '❌ Failed'} | IP: ${typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : 'unknown'}`);
    } catch (error) {
        // Never let audit logging break the main flow
        console.error('⚠️  Audit log error (non-blocking):', error.message);
    }
};

module.exports = { logSecurityEvent };
