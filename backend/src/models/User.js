const db = require('../config/database');

class UserModel {
    // Create a new user
    static async create({ name, email, password_hash, google_id, role = 'user', branch_id }) {
        const query = `
      INSERT INTO users (name, email, password_hash, google_id, role, branch_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, name, email, role, branch_id, created_at
    `;
        const values = [name, email, password_hash, google_id, role, branch_id];
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
        const query = 'SELECT user_id, name, email, role, branch_id, created_at, last_login FROM users WHERE user_id = $1';
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
        const query = `
            SELECT 
                u.user_id, 
                u.name, 
                u.email, 
                u.role, 
                u.branch_id,
                b.name as branch_name,
                u.created_at, 
                u.last_login 
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.branch_id
            ORDER BY u.created_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }


    // Get all users by branch (for managers)
    static async getAllByBranch(branch_id) {
        console.log('getAllByBranch called with branch_id:', branch_id);
        const query = `
            SELECT 
                u.user_id, 
                u.name, 
                u.email, 
                u.role, 
                u.branch_id,
                b.name as branch_name,
                u.created_at, 
                u.last_login 
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.branch_id
            WHERE u.branch_id = $1
            ORDER BY u.created_at DESC
        `;
        console.log('Executing query with parameter:', [branch_id]);
        const result = await db.query(query, [branch_id]);
        console.log('Query returned', result.rows.length, 'users');
        console.log('Users:', result.rows.map(u => ({ id: u.user_id, name: u.name, branch_id: u.branch_id })));
        return result.rows;
    }



    // Update user role and branch
    static async updateRole(user_id, role, branch_id) {
        const query = 'UPDATE users SET role = $1, branch_id = $2 WHERE user_id = $3 RETURNING user_id, name, email, role, branch_id';
        const result = await db.query(query, [role, branch_id, user_id]);
        return result.rows[0];
    }

    // Delete user
    static async delete(user_id) {
        const query = 'DELETE FROM users WHERE user_id = $1';
        await db.query(query, [user_id]);
    }
}

module.exports = UserModel;
