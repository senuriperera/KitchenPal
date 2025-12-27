const express = require('express');
const router = express.Router();
const CommonController = require('../controllers/commonController');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

// Routes
router.get('/units', authenticate, CommonController.getAllUnits);
router.get('/storage-types', authenticate, CommonController.getAllStorageTypes);

// Branch routes - Admin only
router.get('/branches', authenticate, requireRole(['admin']), CommonController.getAllBranches);
router.get('/branches/:id', authenticate, requireRole(['admin']), CommonController.getBranchById);
router.post('/branches', authenticate, requireRole(['admin']), CommonController.createBranch);
router.put('/branches/:id', authenticate, requireRole(['admin']), CommonController.updateBranch);
router.delete('/branches/:id', authenticate, requireRole(['admin']), CommonController.deleteBranch);

module.exports = router;
