jest.mock('../../src/models/User');

const UserModel = require('../../src/models/User');
const UserController = require('../../src/controllers/userController');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => jest.clearAllMocks());

describe('UserController.getAllUsers', () => {
    it('returns formatted users for admin', async () => {
        UserModel.getAll.mockResolvedValue([
            { user_id: 1, name: 'Admin', email: 'a@b.com', role: 'admin', branch_name: null, last_login: null },
        ]);
        const res = mockRes();
        await UserController.getAllUsers({ user: { user_id: 1, role: 'admin' } }, res);
        expect(UserModel.getAll).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ email: 'a@b.com', branch: 'N/A', lastLogin: 'Never' })]);
    });

    it('returns branch-filtered users for branch_manager', async () => {
        UserModel.getAllByBranch.mockResolvedValue([]);
        const res = mockRes();
        await UserController.getAllUsers({ user: { user_id: 2, role: 'branch_manager', branch_id: 3 } }, res);
        expect(UserModel.getAllByBranch).toHaveBeenCalledWith(3);
    });

    it('returns 400 when branch_manager has no branch_id', async () => {
        const res = mockRes();
        await UserController.getAllUsers({ user: { user_id: 2, role: 'branch_manager', branch_id: null } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'User must be assigned to a branch' });
    });
});

describe('UserController.createUser', () => {
    it('returns 400 when required fields are missing', async () => {
        const res = mockRes();
        await UserController.createUser({ body: { name: 'T' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('returns 400 when email already registered', async () => {
        UserModel.findByEmail.mockResolvedValue({ user_id: 1 });
        const res = mockRes();
        await UserController.createUser({ body: { name: 'T', email: 'a@b.com', role: 'staff', password: 'pass' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('creates user and returns 201', async () => {
        UserModel.findByEmail.mockResolvedValue(null);
        UserModel.create.mockResolvedValue({ user_id: 10, name: 'New', email: 'n@n.com', role: 'staff', branch_id: 1 });
        const res = mockRes();
        await UserController.createUser({ body: { name: 'New', email: 'n@n.com', role: 'staff', password: 'pass123', branch_id: 1 } }, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User created successfully' }));
    });
});

describe('UserController.updateUser', () => {
    it('returns 404 when user not found', async () => {
        UserModel.findById.mockResolvedValue(null);
        const res = mockRes();
        await UserController.updateUser({ params: { id: '999' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when new email is already taken', async () => {
        UserModel.findById.mockResolvedValueOnce({ user_id: 1, email: 'old@x.com' });
        UserModel.findByEmail.mockResolvedValue({ user_id: 2 });
        const res = mockRes();
        await UserController.updateUser({ params: { id: '1' }, body: { email: 'taken@x.com' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email already in use' });
    });

    it('updates role and returns updated user', async () => {
        UserModel.findById
            .mockResolvedValueOnce({ user_id: 1, email: 'a@b.com' })
            .mockResolvedValueOnce({ user_id: 1, name: 'Admin', email: 'a@b.com', role: 'admin' });
        UserModel.update.mockResolvedValue();
        const res = mockRes();
        await UserController.updateUser({ params: { id: '1' }, body: { role: 'admin' } }, res);
        expect(UserModel.update).toHaveBeenCalledWith(1, { role: 'admin' });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User updated successfully' }));
    });
});

describe('UserController.deleteUser', () => {
    it('returns 404 when user not found', async () => {
        UserModel.findById.mockResolvedValue(null);
        const res = mockRes();
        await UserController.deleteUser({ params: { id: '999' }, user: { user_id: 1 } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when deleting own account', async () => {
        UserModel.findById.mockResolvedValue({ user_id: 1 });
        const res = mockRes();
        await UserController.deleteUser({ params: { id: '1' }, user: { user_id: 1 } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Cannot delete your own account' });
    });

    it('deletes user successfully', async () => {
        UserModel.findById.mockResolvedValue({ user_id: 2 });
        UserModel.delete.mockResolvedValue();
        const res = mockRes();
        await UserController.deleteUser({ params: { id: '2' }, user: { user_id: 1 } }, res);
        expect(UserModel.delete).toHaveBeenCalledWith('2');
        expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });
});
