const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');

class UserController {
    // Get all users
    static async getAllUsers(req, res) {
        try {
            let users;

            // Debug logging
            console.log('=== GET ALL USERS REQUEST ===');
            console.log('User making request:', {
                user_id: req.user.user_id,
                role: req.user.role,
                branch_id: req.user.branch_id
            });

            // If user is a manager or staff, only get users from their branch
            if (req.user.role === 'manager' || req.user.role === 'staff') {
                if (!req.user.branch_id) {
                    console.error('ERROR: User without branch_id');
                    return res.status(400).json({ error: 'User must be assigned to a branch' });
                }
                console.log('Fetching users for branch_id:', req.user.branch_id);
                users = await UserModel.getAllByBranch(req.user.branch_id);
                console.log('Users found for branch:', users.length);
            } else {
                // Admin can see all users
                console.log('Admin - fetching all users');
                users = await UserModel.getAll();
                console.log('Total users found:', users.length);
            }

            // Format the response to match frontend expectations
            const formattedUsers = users.map(user => ({
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch_name || 'N/A',
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
            const { name, email, role, password, branch_id } = req.body;

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
                role,
                branch_id
            });

            res.status(201).json({
                message: 'User created successfully',
                user: {
                    id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    branch_id: user.branch_id
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
