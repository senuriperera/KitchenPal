const { UnitModel, StorageTypeModel } = require('../models/CommonModels');
const BranchModel = require('../models/Branch');

class CommonController {
    // Get all units
    static async getAllUnits(req, res) {
        try {
            const units = await UnitModel.getAll();
            res.json({ units });
        } catch (error) {
            console.error('Get units error:', error);
            res.status(500).json({ error: 'Failed to fetch units' });
        }
    }

    // Get all storage types
    static async getAllStorageTypes(req, res) {
        try {
            const storageTypes = await StorageTypeModel.getAll();
            res.json({ storageTypes });
        } catch (error) {
            console.error('Get storage types error:', error);
            res.status(500).json({ error: 'Failed to fetch storage types' });
        }
    }

    // Get all branches
    static async getAllBranches(req, res) {
        try {
            const branches = await BranchModel.getAll();
            res.json(branches);
        } catch (error) {
            console.error('Get branches error:', error);
            res.status(500).json({ error: 'Failed to fetch branches' });
        }
    }

    // Get branch by ID
    static async getBranchById(req, res) {
        try {
            const { id } = req.params;
            const branch = await BranchModel.getById(id);

            if (!branch) {
                return res.status(404).json({ error: 'Branch not found' });
            }

            res.json(branch);
        } catch (error) {
            console.error('Get branch error:', error);
            res.status(500).json({ error: 'Failed to fetch branch' });
        }
    }

    // Create new branch
    static async createBranch(req, res) {
        try {
            const { name, address, contact_email, contact_number } = req.body;

            // Validate required fields
            if (!name || !address || !contact_email || !contact_number) {
                return res.status(400).json({
                    error: 'Missing required fields: name, address, contact_email, contact_number'
                });
            }

            const branch = await BranchModel.create({
                name,
                address,
                contact_email,
                contact_number
            });

            res.status(201).json(branch);
        } catch (error) {
            console.error('Create branch error:', error);
            res.status(500).json({ error: 'Failed to create branch' });
        }
    }

    // Update branch
    static async updateBranch(req, res) {
        try {
            const { id } = req.params;
            const { name, address, contact_email, contact_number } = req.body;

            const branch = await BranchModel.update(id, {
                name,
                address,
                contact_email,
                contact_number
            });

            if (!branch) {
                return res.status(404).json({ error: 'Branch not found' });
            }

            res.json(branch);
        } catch (error) {
            console.error('Update branch error:', error);
            res.status(500).json({ error: 'Failed to update branch' });
        }
    }

    // Delete branch (soft delete)
    static async deleteBranch(req, res) {
        try {
            const { id } = req.params;
            const result = await BranchModel.delete(id);

            if (!result) {
                return res.status(404).json({ error: 'Branch not found' });
            }

            res.json({ message: 'Branch deleted successfully', id: result.id });
        } catch (error) {
            console.error('Delete branch error:', error);
            res.status(500).json({ error: 'Failed to delete branch' });
        }
    }
}

module.exports = CommonController;
