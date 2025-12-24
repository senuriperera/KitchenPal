const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const SessionModel = require('../models/Session');
const config = require('../config/config');

class AuthController {
    // Register new user
    static async register(req, res) {
        try {
            const { name, email, password, role } = req.body;

            // Check if user exists
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password
            const password_hash = await bcrypt.hash(password, 10);

            // Create user
            const user = await UserModel.create({
                name,
                email,
                password_hash,
                google_id: null,
                role: role || 'user',
            });

            // Generate access and refresh tokens
            const accessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            const refreshToken = jwt.sign(
                { user_id: user.user_id, type: 'refresh' },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshTokenExpiresIn }
            );

            // Create session
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
                },
                accessToken,
                refreshToken,
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Update last login
            await UserModel.updateLastLogin(user.user_id);

            // Generate access and refresh tokens
            const accessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            const refreshToken = jwt.sign(
                { user_id: user.user_id, type: 'refresh' },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshTokenExpiresIn }
            );

            // Create session
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
                },
                accessToken,
                refreshToken,
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    // Logout
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

    // Get current user
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

    // Google OAuth callback handler
    static async googleCallback(req, res) {
        try {
            // User is already authenticated via passport
            const user = req.user;

            // Generate access and refresh tokens
            const accessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            const refreshToken = jwt.sign(
                { user_id: user.user_id, type: 'refresh' },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshTokenExpiresIn }
            );

            // Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionModel.create({
                user_id: user.user_id,
                jwt_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt,
                user_agent: req.headers['user-agent'],
                ip_address: req.ip,
            });

            // Redirect to frontend with tokens
            res.redirect(`${config.frontend.url}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect(`${config.frontend.url}/auth/error`);
        }
    }

    // Refresh access token
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }

            // Verify refresh token
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, config.jwt.secret);
            } catch (error) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            // Check if it's a refresh token
            if (decoded.type !== 'refresh') {
                return res.status(401).json({ error: 'Invalid token type' });
            }

            // Find session by refresh token
            const session = await SessionModel.findByRefreshToken(refreshToken);
            if (!session) {
                return res.status(401).json({ error: 'Session not found or expired' });
            }

            // Get user details
            const user = await UserModel.findById(decoded.user_id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Generate new access token
            const newAccessToken = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.accessTokenExpiresIn }
            );

            // Update session with new access token
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
