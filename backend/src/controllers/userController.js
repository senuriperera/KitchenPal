const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');

class UserController {
    static async getAllUsers(req, res) {
        try {
            let users;

            console.log('=== GET ALL USERS REQUEST ===');
            console.log('User making request:', {
                user_id: req.user.user_id,
                role: req.user.role,
                branch_id: req.user.branch_id
            });

            if (req.user.role === 'branch_manager' || req.user.role === 'staff') {
                if (!req.user.branch_id) {
                    console.error('ERROR: User without branch_id');
                    return res.status(400).json({ error: 'User must be assigned to a branch' });
                }
                console.log('Fetching users for branch_id:', req.user.branch_id);
                users = await UserModel.getAllByBranch(req.user.branch_id);
                console.log('Users found for branch:', users.length);
            } else {
                console.log('Admin - fetching all users');
                users = await UserModel.getAll();
                console.log('Total users found:', users.length);
            }

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

    static async createUser(req, res) {
        try {
            const { name, email, role, password, branch_id } = req.body;

            if (!name || !email || !role || !password) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const password_hash = await bcrypt.hash(password, 10);

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

    static async updateUser(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const { name, email, role, password, branch_id } = req.body;

            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (email && email !== existingUser.email) {
                const emailTaken = await UserModel.findByEmail(email);
                if (emailTaken) {
                    return res.status(400).json({ error: 'Email already in use' });
                }
            }

            const updateFields = {};
            if (name !== undefined && name !== null) updateFields.name = name;
            if (email !== undefined && email !== null) updateFields.email = email;
            if (role !== undefined && role !== null) updateFields.role = role;
            if (branch_id !== undefined) {
                updateFields.branch_id = branch_id === null ? null : parseInt(branch_id, 10);
            }
            if (password) {
                updateFields.password_hash = await bcrypt.hash(password, 10);
            }

            await UserModel.update(id, updateFields);

            const updatedUser = await UserModel.findById(id);

            res.json({
                message: 'User updated successfully',
                user: {
                    id: updatedUser.user_id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    branch_id: updatedUser.branch_id
                }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

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
