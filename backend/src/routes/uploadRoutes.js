const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const authenticate = require('../middleware/auth');
const { upload } = require('../utils/cloudinaryService');

// Upload single image
router.post('/image', authenticate, upload.single('image'), UploadController.uploadImage);

// Upload multiple images
router.post('/images', authenticate, upload.array('images', 5), UploadController.uploadMultipleImages);

// Delete image
router.delete('/image', authenticate, UploadController.deleteImage);

module.exports = router;
