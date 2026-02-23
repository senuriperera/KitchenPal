const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Create multer upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: fileFilter,
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise} - Cloudinary upload result
 */
const uploadImage = (buffer, folder = 'kitchenpal/recipes') => {
    return new Promise((resolve, reject) => {
        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
            reject(new Error('Cloudinary upload timeout after 30 seconds'));
        }, 30000);

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'limit' }],
                timeout: 30000,
            },
            (error, result) => {
                clearTimeout(timeout);
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise} - Cloudinary delete result
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

/**
 * Get public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
};

module.exports = {
    cloudinary,
    upload,
    uploadImage,
    deleteImage,
    getPublicIdFromUrl,
};
