const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const SessionModel = require('../models/Session');
const config = require('../config/config');

class AuthController {

    static async register(req, res) {
        try {
            const { name, email, password, role } = req.body;

            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const password_hash = await bcrypt.hash(password, 10);

            const user = await UserModel.create({
                name,
                email,
                password_hash,
                role: role || 'user',
            });

            const accessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role, branch_id: user.branch_id },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            const refreshToken = jwt.sign(
                { user_id: user.user_id, type: 'refresh' },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshTokenExpiresIn }
            );

            await SessionModel.deleteAllUserSessions(user.user_id);

            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await SessionModel.create({
                user_id: user.user_id,
                jwt_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt,
                user_agent: req.headers['user-agent'],
                ip_address: req.ip,
            });

            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    branch_id: user.branch_id
                },
                accessToken,
                refreshToken,
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;

            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            await UserModel.updateLastLogin(user.user_id);

            const accessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role, branch_id: user.branch_id },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            const refreshToken = jwt.sign(
                { user_id: user.user_id, type: 'refresh' },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshTokenExpiresIn }
            );

            await SessionModel.deleteAllUserSessions(user.user_id);

            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionModel.create({
                user_id: user.user_id,
                jwt_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt,
                user_agent: req.headers['user-agent'],
                ip_address: req.ip,
            });

            res.json({
                message: 'Login successful',
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    branch_id: user.branch_id
                },
                accessToken,
                refreshToken,
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    static async logout(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (token) {
                const session = await SessionModel.findByToken(token);
                if (session) {
                    await SessionModel.invalidate(session.session_id);
                }
            }

            res.json({ message: 'Logout successful' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    static async getCurrentUser(req, res) {
        try {
            const user = await UserModel.findById(req.user.user_id);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ user });
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ error: 'Failed to get user' });
        }
    }

    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }

            let decoded;
            try {
                decoded = jwt.verify(refreshToken, config.jwt.secret);
            } catch (error) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            if (decoded.type !== 'refresh') {
                return res.status(401).json({ error: 'Invalid token type' });
            }

            const session = await SessionModel.findByRefreshToken(refreshToken);
            if (!session) {
                return res.status(401).json({ error: 'Session not found or expired' });
            }

            const user = await UserModel.findById(decoded.user_id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const newAccessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role, branch_id: user.branch_id },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            await SessionModel.updateAccessToken(session.session_id, newAccessToken);

            res.json({
                accessToken: newAccessToken,
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({ error: 'Token refresh failed' });
        }
    }
}

module.exports = AuthController;
