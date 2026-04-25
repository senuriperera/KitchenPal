jest.mock('../src/models/User');
jest.mock('../src/models/Session');
jest.mock('../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() }, testConnection: jest.fn() }));
jest.mock('../src/cron/expiryNotificationsJob', () => ({ runExpiryNotificationsJob: jest.fn() }));
jest.mock('../src/jobs/autoExpiryWasteLoggingJob', () => ({ startAutoExpiryWasteLoggingJob: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const UserModel = require('../src/models/User');
const SessionModel = require('../src/models/Session');

beforeEach(() => jest.clearAllMocks());

describe('Auth API – POST /api/auth/register', () => {
    it('returns 400 for invalid email', async () => {
        const res = await request(app).post('/api/auth/register').send({ name: 'T', email: 'not-email', password: 'pass123' });
        expect(res.status).toBe(400);
    });

    it('returns 400 for password shorter than 6 chars', async () => {
        const res = await request(app).post('/api/auth/register').send({ name: 'T', email: 'a@b.com', password: '123' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when email already registered', async () => {
        UserModel.findByEmail.mockResolvedValue({ user_id: 1 });
        const res = await request(app).post('/api/auth/register').send({ name: 'T', email: 'a@b.com', password: 'pass123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email already registered');
    });

    it('returns 201 with tokens on success', async () => {
        UserModel.findByEmail.mockResolvedValue(null);
        UserModel.create.mockResolvedValue({ user_id: 1, name: 'T', email: 'a@b.com', role: 'user', branch_id: null });
        SessionModel.deleteAllUserSessions.mockResolvedValue();
        SessionModel.create.mockResolvedValue({ session_id: 1 });

        const res = await request(app).post('/api/auth/register').send({ name: 'T', email: 'a@b.com', password: 'pass123' });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
    });
});

describe('Auth API – POST /api/auth/login', () => {
    it('returns 400 for missing credentials', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(400);
    });

    it('returns 401 for non-existent user', async () => {
        UserModel.findByEmail.mockResolvedValue(null);
        const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'pass' });
        expect(res.status).toBe(401);
    });

    it('returns 200 with tokens on valid credentials', async () => {
        const hash = await bcrypt.hash('pass123', 10);
        UserModel.findByEmail.mockResolvedValue({ user_id: 1, name: 'Admin', email: 'a@b.com', password_hash: hash, role: 'admin', branch_id: null });
        UserModel.updateLastLogin.mockResolvedValue();
        SessionModel.deleteAllUserSessions.mockResolvedValue();
        SessionModel.create.mockResolvedValue({ session_id: 1 });

        const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'pass123' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body.user.email).toBe('a@b.com');
    });
});

describe('Auth API – POST /api/auth/refresh', () => {
    it('returns 400 when refresh token is missing', async () => {
        const res = await request(app).post('/api/auth/refresh').send({});
        expect(res.status).toBe(400);
    });
});
