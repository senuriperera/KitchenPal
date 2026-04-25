jest.mock('../../src/models/User');
jest.mock('../../src/models/Session');
jest.mock('../../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() }, testConnection: jest.fn() }));
jest.mock('../../src/config/config', () => ({
    jwt: { secret: 'test_secret', accessTokenExpiresIn: '15m', refreshTokenExpiresIn: '7d' },
    frontend: { url: 'http://localhost:4200' },
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../../src/models/User');
const SessionModel = require('../../src/models/Session');
const AuthController = require('../../src/controllers/authController');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn();
    return res;
};

const baseReq = { headers: {}, ip: '127.0.0.1' };

beforeEach(() => jest.clearAllMocks());

describe('AuthController.register', () => {
    it('returns 400 when email already registered', async () => {
        UserModel.findByEmail.mockResolvedValue({ user_id: 1 });
        const res = mockRes();
        await AuthController.register({ ...baseReq, body: { name: 'T', email: 'a@b.com', password: 'pass' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('creates user and returns 201 with tokens', async () => {
        UserModel.findByEmail.mockResolvedValue(null);
        UserModel.create.mockResolvedValue({ user_id: 1, name: 'T', email: 'new@test.com', role: 'user', branch_id: null });
        SessionModel.deleteAllUserSessions.mockResolvedValue();
        SessionModel.create.mockResolvedValue({ session_id: 1 });

        const res = mockRes();
        await AuthController.register({ ...baseReq, body: { name: 'T', email: 'new@test.com', password: 'pass123' } }, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'User registered successfully',
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
        }));
    });
});

describe('AuthController.login', () => {
    it('returns 401 when user does not exist', async () => {
        UserModel.findByEmail.mockResolvedValue(null);
        const res = mockRes();
        await AuthController.login({ ...baseReq, body: { email: 'x@x.com', password: 'pass' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('returns 401 for wrong password', async () => {
        UserModel.findByEmail.mockResolvedValue({
            user_id: 1, email: 'a@b.com',
            password_hash: await bcrypt.hash('correct', 10),
            role: 'admin',
        });
        const res = mockRes();
        await AuthController.login({ ...baseReq, body: { email: 'a@b.com', password: 'wrong' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 200 with tokens on valid credentials', async () => {
        const hash = await bcrypt.hash('pass123', 10);
        UserModel.findByEmail.mockResolvedValue({ user_id: 1, name: 'Admin', email: 'a@b.com', password_hash: hash, role: 'admin', branch_id: null });
        UserModel.updateLastLogin.mockResolvedValue();
        SessionModel.deleteAllUserSessions.mockResolvedValue();
        SessionModel.create.mockResolvedValue({ session_id: 1 });

        const res = mockRes();
        await AuthController.login({ ...baseReq, body: { email: 'a@b.com', password: 'pass123' } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Login successful',
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
        }));
    });
});

describe('AuthController.logout', () => {
    it('returns 200 with no token in header', async () => {
        const res = mockRes();
        await AuthController.logout({ headers: {} }, res);
        expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });

    it('invalidates session when token is present', async () => {
        const token = jwt.sign({ user_id: 1 }, 'test_secret');
        SessionModel.findByToken.mockResolvedValue({ session_id: 99 });
        SessionModel.invalidate.mockResolvedValue();

        const res = mockRes();
        await AuthController.logout({ headers: { authorization: `Bearer ${token}` } }, res);
        expect(SessionModel.invalidate).toHaveBeenCalledWith(99);
        expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });
});

describe('AuthController.refreshToken', () => {
    it('returns 400 when refresh token is missing', async () => {
        const res = mockRes();
        await AuthController.refreshToken({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Refresh token required' });
    });

    it('returns 401 for invalid refresh token', async () => {
        const res = mockRes();
        await AuthController.refreshToken({ body: { refreshToken: 'bad.token' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });

    it('returns 401 for token with wrong type', async () => {
        const token = jwt.sign({ user_id: 1, type: 'access' }, 'test_secret', { expiresIn: '7d' });
        const res = mockRes();
        await AuthController.refreshToken({ body: { refreshToken: token } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token type' });
    });

    it('returns new access token on valid refresh', async () => {
        const refreshToken = jwt.sign({ user_id: 1, type: 'refresh' }, 'test_secret', { expiresIn: '7d' });
        SessionModel.findByRefreshToken.mockResolvedValue({ session_id: 1 });
        UserModel.findById.mockResolvedValue({ user_id: 1, email: 'a@b.com', role: 'admin', branch_id: null });
        SessionModel.updateAccessToken.mockResolvedValue();

        const res = mockRes();
        await AuthController.refreshToken({ body: { refreshToken } }, res);
        expect(res.json).toHaveBeenCalledWith({ accessToken: expect.any(String) });
    });

    it('returns 401 when session not found', async () => {
        const refreshToken = jwt.sign({ user_id: 1, type: 'refresh' }, 'test_secret', { expiresIn: '7d' });
        SessionModel.findByRefreshToken.mockResolvedValue(null);

        const res = mockRes();
        await AuthController.refreshToken({ body: { refreshToken } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('AuthController.getCurrentUser', () => {
    it('returns 404 when user not found', async () => {
        UserModel.findById.mockResolvedValue(null);
        const res = mockRes();
        await AuthController.getCurrentUser({ user: { user_id: 99 } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns current user data', async () => {
        const user = { user_id: 1, name: 'Admin', email: 'a@b.com', role: 'admin' };
        UserModel.findById.mockResolvedValue(user);
        const res = mockRes();
        await AuthController.getCurrentUser({ user: { user_id: 1 } }, res);
        expect(res.json).toHaveBeenCalledWith({ user });
    });
});
