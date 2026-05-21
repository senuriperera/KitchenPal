const db = require('../config/database');

class SessionModel {
    static async create({ user_id, jwt_token, refresh_token, expires_at, user_agent, ip_address }) {
        const query = `
      INSERT INTO sessions (user_id, jwt_token, refresh_token, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const values = [user_id, jwt_token, refresh_token, expires_at, user_agent, ip_address];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async findByToken(jwt_token) {
        const query = 'SELECT * FROM sessions WHERE jwt_token = $1 AND is_active = true AND expires_at > NOW()';
        const result = await db.query(query, [jwt_token]);
        return result.rows[0];
    }

    static async findByRefreshToken(refresh_token) {
        const query = 'SELECT * FROM sessions WHERE refresh_token = $1 AND is_active = true AND expires_at > NOW()';
        const result = await db.query(query, [refresh_token]);
        return result.rows[0];
    }

    static async updateAccessToken(session_id, jwt_token) {
        const query = 'UPDATE sessions SET jwt_token = $1 WHERE session_id = $2 RETURNING *';
        const result = await db.query(query, [jwt_token, session_id]);
        return result.rows[0];
    }

    static async findByUserId(user_id) {
        const query = 'SELECT * FROM sessions WHERE user_id = $1 AND is_active = true AND expires_at > NOW() ORDER BY created_at DESC';
        const result = await db.query(query, [user_id]);
        return result.rows;
    }

    static async invalidate(session_id) {
        const query = 'UPDATE sessions SET is_active = false WHERE session_id = $1';
        await db.query(query, [session_id]);
    }

    static async invalidateAllUserSessions(user_id) {
        const query = 'UPDATE sessions SET is_active = false WHERE user_id = $1';
        await db.query(query, [user_id]);
    }

    static async deleteAllUserSessions(user_id) {
        const query = 'DELETE FROM sessions WHERE user_id = $1';
        const result = await db.query(query, [user_id]);
        return result.rowCount;
    }

    static async cleanExpired() {
        const query = 'DELETE FROM sessions WHERE expires_at < NOW()';
        const result = await db.query(query);
        return result.rowCount;
    }
}

module.exports = SessionModel;
