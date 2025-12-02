const jwt = require('jsonwebtoken');
const SessionModel = require('../models/Session');
const config = require('../config/config');

const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT
        const decoded = jwt.verify(token, config.jwt.secret);

        // Check if session is valid
        const session = await SessionModel.findByToken(token);

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // Attach user to request
        req.user = decoded;
        req.session_id = session.session_id;

        next();
    } catch (error) {
        console.error('Authentication error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }

        return res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = authenticate;
