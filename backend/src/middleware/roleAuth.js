/**
 * Role-based authorization middleware
 */

/**
 * Middleware to check if user has required role
 * @param {Array<string>} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Case-insensitive role comparison
        const userRole = req.user.role?.toLowerCase();
        const hasPermission = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!hasPermission) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        next();
    };
};

/**
 * Middleware to attach branch filter for managers
 * Managers can only access data from their own branch
 * Admins can access all data
 */
const filterByBranch = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // If user is a manager, attach their branch_id to the request (case-insensitive check)
    if (req.user.role?.toLowerCase() === 'manager') {
        req.branchFilter = req.user.branch_id;
    }
    // If user is admin, no filter is applied (can access all branches)

    next();
};

module.exports = {
    requireRole,
    filterByBranch
};
