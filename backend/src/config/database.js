const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('🔍 Testing database connection...');
        const result = await client.query('SELECT NOW()');
        console.log('✅ Database connection test successful:', result.rows[0].now);
        client.release();
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
        throw err;
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool,
    testConnection,
};
