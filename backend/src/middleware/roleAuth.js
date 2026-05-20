

/**
 * Middleware to check if user has required role
 * @param {Array<string>} allowedRoles 
 * @returns {Function} 
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

const filterByBranch = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // If user is a manager, attach their branch_id to the request 
    if (req.user.role?.toLowerCase() === 'branch_manager') {
        req.branchFilter = req.user.branch_id;
    }
    // If user is admin, no filter is applied 

    next();
};

module.exports = {
    requireRole,
    filterByBranch
};
