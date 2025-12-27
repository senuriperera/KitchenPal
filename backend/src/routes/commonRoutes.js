const express = require('express');
const router = express.Router();
const CommonController = require('../controllers/commonController');
const authenticate = require('../middleware/auth');

// Routes
router.get('/units', authenticate, CommonController.getAllUnits);
router.get('/storage-types', authenticate, CommonController.getAllStorageTypes);

// Branch routes
router.get('/branches', authenticate, CommonController.getAllBranches);
router.get('/branches/:id', authenticate, CommonController.getBranchById);
router.post('/branches', authenticate, CommonController.createBranch);
router.put('/branches/:id', authenticate, CommonController.updateBranch);
router.delete('/branches/:id', authenticate, CommonController.deleteBranch);

module.exports = router;
