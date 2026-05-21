const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const multer = require('multer');

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: fileFilter,
});

const uploadImage = (buffer, folder = 'kitchenpal/recipes') => {
    return new Promise((resolve, reject) => {
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

const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

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
