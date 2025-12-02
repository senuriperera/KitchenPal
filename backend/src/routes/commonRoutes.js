const express = require('express');
const router = express.Router();
const CommonController = require('../controllers/commonController');
const authenticate = require('../middleware/auth');

// Routes
router.get('/units', authenticate, CommonController.getAllUnits);
router.get('/storage-types', authenticate, CommonController.getAllStorageTypes);

module.exports = router;
