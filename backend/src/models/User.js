const db = require('../config/database');

class UserModel {
    // Create a new user
    static async create({ name, email, password_hash, google_id, role = 'user' }) {
        const query = `
      INSERT INTO users (name, email, password_hash, google_id, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, name, email, role, created_at
    `;
        const values = [name, email, password_hash, google_id, role];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Find user by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    // Find user by ID
    static async findById(user_id) {
        const query = 'SELECT user_id, name, email, role, created_at, last_login FROM users WHERE user_id = $1';
        const result = await db.query(query, [user_id]);
        return result.rows[0];
    }

    // Find user by Google ID
    static async findByGoogleId(google_id) {
        const query = 'SELECT * FROM users WHERE google_id = $1';
        const result = await db.query(query, [google_id]);
        return result.rows[0];
    }

    // Update last login
    static async updateLastLogin(user_id) {
        const query = 'UPDATE users SET last_login = NOW() WHERE user_id = $1';
        await db.query(query, [user_id]);
    }

    // Get all users (for admin)
    static async getAll() {
        const query = 'SELECT user_id, name, email, role, created_at, last_login FROM users ORDER BY created_at DESC';
        const result = await db.query(query);
        return result.rows;
    }

    // Update user role
    static async updateRole(user_id, role) {
        const query = 'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, name, email, role';
        const result = await db.query(query, [role, user_id]);
        return result.rows[0];
    }

    // Delete user
    static async delete(user_id) {
        const query = 'DELETE FROM users WHERE user_id = $1';
        await db.query(query, [user_id]);
    }
}

module.exports = UserModel;
