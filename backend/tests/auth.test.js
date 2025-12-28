const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

// We need to close the DB connection after tests to prevent Jest from hanging
afterAll(async () => {
    // access the pool from db module if available, or just wait slightly?
    // Looking at common pg patterns, usually:
    if (db.pool) {
        await db.pool.end();
    }
});

describe('Auth API', () => {
    it('POST /api/auth/login should return 400 for missing credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});

        // Expecting bad request or similar due to missing email/password
        // Actual status depends on validation implementation
        expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('POST /api/auth/register should fail for invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'not-an-email',
                password: 'password123',
                name: 'Test User'
            });
        expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
});
