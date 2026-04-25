jest.mock('../../src/models/Session');
jest.mock('../../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() }, testConnection: jest.fn() }));
jest.mock('../../src/config/config', () => ({
    jwt: { secret: 'test_secret', accessTokenExpiresIn: '15m', refreshTokenExpiresIn: '7d' },
    session: { secret: 'test_session_secret', resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } },
    frontend: { url: 'http://localhost:4200' },
    nodeEnv: 'test',
}));

const jwt = require('jsonwebtoken');
const SessionModel = require('../../src/models/Session');
const authenticate = require('../../src/middleware/auth');
const { requireRole, filterByBranch } = require('../../src/middleware/roleAuth');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const VALID_TOKEN = jwt.sign({ user_id: 1, email: 'a@b.com', role: 'admin' }, 'test_secret', { expiresIn: '15m' });

describe('authenticate middleware', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 401 with no Authorization header', async () => {
        const res = mockRes();
        await authenticate({ headers: {} }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('returns 401 for malformed Bearer token', async () => {
        const res = mockRes();
        await authenticate({ headers: { authorization: 'Bearer bad.token' } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when session not found in DB', async () => {
        SessionModel.findByToken.mockResolvedValue(null);
        const res = mockRes();
        await authenticate({ headers: { authorization: `Bearer ${VALID_TOKEN}` } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired session' });
    });

    it('attaches user and calls next for valid token + session', async () => {
        SessionModel.findByToken.mockResolvedValue({ session_id: 42 });
        const req = { headers: { authorization: `Bearer ${VALID_TOKEN}` } };
        const next = jest.fn();
        await authenticate(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toMatchObject({ user_id: 1, email: 'a@b.com', role: 'admin' });
        expect(req.session_id).toBe(42);
    });
});

describe('requireRole middleware', () => {
    it('returns 401 when req.user is absent', () => {
        const res = mockRes();
        requireRole(['admin'])({}, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 for insufficient role', () => {
        const res = mockRes();
        requireRole(['admin'])({ user: { role: 'staff' } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('calls next for matching role', () => {
        const next = jest.fn();
        requireRole(['admin'])({ user: { role: 'admin' } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it('is case-insensitive', () => {
        const next = jest.fn();
        requireRole(['admin'])({ user: { role: 'ADMIN' } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it('allows multiple roles', () => {
        const next = jest.fn();
        requireRole(['admin', 'branch_manager'])({ user: { role: 'branch_manager' } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('filterByBranch middleware', () => {
    it('returns 401 when req.user is absent', () => {
        const res = mockRes();
        filterByBranch({}, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('sets branchFilter for branch_manager', () => {
        const req = { user: { role: 'branch_manager', branch_id: 5 } };
        const next = jest.fn();
        filterByBranch(req, mockRes(), next);
        expect(req.branchFilter).toBe(5);
        expect(next).toHaveBeenCalled();
    });

    it('does not set branchFilter for admin', () => {
        const req = { user: { role: 'admin' } };
        const next = jest.fn();
        filterByBranch(req, mockRes(), next);
        expect(req.branchFilter).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });
});
