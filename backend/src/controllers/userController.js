const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');

class UserController {
    // Get all users
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAll();

            // Format the response to match frontend expectations
            const formattedUsers = users.map(user => ({
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: 'N/A', // TODO: Add branch relationship when needed
                lastLogin: user.last_login ? new Date(user.last_login).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }) : 'Never'
            }));

            res.json(formattedUsers);
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    // Create new user
    static async createUser(req, res) {
        try {
            const { name, email, role, password } = req.body;

            // Validate required fields
            if (!name || !email || !role || !password) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            // Check if user already exists
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
                role
            });

            res.status(201).json({
                message: 'User created successfully',
                user: {
                    id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role, password } = req.body;

            // Check if user exists
            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // If email is being changed, check if new email is already taken
            if (email && email !== existingUser.email) {
                const emailTaken = await UserModel.findByEmail(email);
                if (emailTaken) {
                    return res.status(400).json({ error: 'Email already in use' });
                }
            }

            // Update role if provided
            if (role) {
                await UserModel.updateRole(id, role);
            }

            // TODO: Add methods to update name, email, password in UserModel if needed

            const updatedUser = await UserModel.findById(id);

            res.json({
                message: 'User updated successfully',
                user: {
                    id: updatedUser.user_id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role
                }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }

    // Delete user
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Check if user exists
            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent deleting yourself
            if (req.user && req.user.user_id === parseInt(id)) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            await UserModel.delete(id);

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
}

module.exports = UserController;
