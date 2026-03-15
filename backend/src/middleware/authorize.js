const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (roles.length) {
            const userRole = (req.user.role || '').toLowerCase();
            const allowed = roles.some((role) => role.toLowerCase() === userRole);

            if (!allowed) {
                return res
                    .status(403)
                    .json({ error: 'Forbidden: Insufficient permissions' });
            }
        }

        next();
    };
};

module.exports = authorize;
