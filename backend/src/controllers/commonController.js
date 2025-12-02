const { UnitModel, StorageTypeModel } = require('../models/CommonModels');

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
}

module.exports = CommonController;
