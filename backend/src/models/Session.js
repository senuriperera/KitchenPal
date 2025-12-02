const db = require('../config/database');

class SessionModel {
    // Create a new session
    static async create({ user_id, jwt_token, expires_at, user_agent, ip_address }) {
        const query = `
      INSERT INTO sessions (user_id, jwt_token, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const values = [user_id, jwt_token, expires_at, user_agent, ip_address];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Find session by token
    static async findByToken(jwt_token) {
        const query = 'SELECT * FROM sessions WHERE jwt_token = $1 AND is_active = true AND expires_at > NOW()';
        const result = await db.query(query, [jwt_token]);
        return result.rows[0];
    }

    // Find active sessions by user ID
    static async findByUserId(user_id) {
        const query = 'SELECT * FROM sessions WHERE user_id = $1 AND is_active = true AND expires_at > NOW() ORDER BY created_at DESC';
        const result = await db.query(query, [user_id]);
        return result.rows;
    }

    // Invalidate session
    static async invalidate(session_id) {
        const query = 'UPDATE sessions SET is_active = false WHERE session_id = $1';
        await db.query(query, [session_id]);
    }

    // Invalidate all user sessions
    static async invalidateAllUserSessions(user_id) {
        const query = 'UPDATE sessions SET is_active = false WHERE user_id = $1';
        await db.query(query, [user_id]);
    }

    // Clean expired sessions
    static async cleanExpired() {
        const query = 'DELETE FROM sessions WHERE expires_at < NOW()';
        const result = await db.query(query);
        return result.rowCount;
    }
}

module.exports = SessionModel;
