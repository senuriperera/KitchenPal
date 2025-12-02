const db = require('../config/database');

class UnitModel {
    // Get all units
    static async getAll() {
        const query = 'SELECT * FROM units ORDER BY name';
        const result = await db.query(query);
        return result.rows;
    }

    // Get unit by ID
    static async findById(unit_id) {
        const query = 'SELECT * FROM units WHERE unit_id = $1';
        const result = await db.query(query, [unit_id]);
        return result.rows[0];
    }

    // Get unit by code
    static async findByCode(code) {
        const query = 'SELECT * FROM units WHERE code = $1';
        const result = await db.query(query, [code]);
        return result.rows[0];
    }
}

class StorageTypeModel {
    // Get all storage types
    static async getAll() {
        const query = 'SELECT * FROM storage_types ORDER BY name';
        const result = await db.query(query);
        return result.rows;
    }

    // Get storage type by ID
    static async findById(storage_type_id) {
        const query = 'SELECT * FROM storage_types WHERE storage_type_id = $1';
        const result = await db.query(query, [storage_type_id]);
        return result.rows[0];
    }

    // Get storage type by code
    static async findByCode(code) {
        const query = 'SELECT * FROM storage_types WHERE code = $1';
        const result = await db.query(query, [code]);
        return result.rows[0];
    }
}

module.exports = { UnitModel, StorageTypeModel };
