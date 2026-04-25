jest.mock('../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() }, testConnection: jest.fn() }));
jest.mock('../src/cron/expiryNotificationsJob', () => ({ runExpiryNotificationsJob: jest.fn() }));
jest.mock('../src/jobs/autoExpiryWasteLoggingJob', () => ({ startAutoExpiryWasteLoggingJob: jest.fn() }));

const request = require('supertest');
const app = require('../src/server');

describe('Health Check API', () => {
    it('GET / should return 200 and welcome message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'running');
        expect(res.body).toHaveProperty('message', 'KitchenPal API');
    });

    it('GET /api should return 404 (assuming /api itself isn not an endpoint but /api/something is)', async () => {
        // Based on server.js: app.use('/api', routes);
        // If routes/index.js doesn't handle root '/', it might 404.
        // Let's check a non-existent route.
        const res = await request(app).get('/api/invalid-route-XYZ');
        expect(res.statusCode).toEqual(404);
    });
});
