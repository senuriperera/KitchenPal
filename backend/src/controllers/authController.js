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

            // Generate JWT
            const token = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await SessionModel.create({
                user_id: user.user_id,
                jwt_token: token,
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
                token,
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

            // Generate JWT
            const token = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionModel.create({
                user_id: user.user_id,
                jwt_token: token,
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
                token,
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

            // Generate JWT
            const token = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionModel.create({
                user_id: user.user_id,
                jwt_token: token,
                expires_at: expiresAt,
                user_agent: req.headers['user-agent'],
                ip_address: req.ip,
            });

            // Redirect to frontend with token
            res.redirect(`${config.frontend.url}/auth/callback?token=${token}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect(`${config.frontend.url}/auth/error`);
        }
    }
}

module.exports = AuthController;
