const { uploadImage, deleteImage, getPublicIdFromUrl } = require('../utils/cloudinaryService');

class UploadController {
    /**
     * Upload single image to Cloudinary
     */
    static async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            // Upload to Cloudinary with timeout handling
            const result = await uploadImage(req.file.buffer, 'kitchenpal/recipes');

            res.status(200).json({
                message: 'Image uploaded successfully',
                imageUrl: result.secure_url,
                publicId: result.public_id,
            });
        } catch (error) {
            console.error('Upload image error:', error);

            // Provide more specific error messages
            if (error.message && error.message.includes('timeout')) {
                return res.status(408).json({ error: 'Image upload timeout. Please try again.' });
            }
            if (error.http_code === 401 || error.message?.includes('credentials')) {
                return res.status(500).json({ error: 'Image upload service configuration error' });
            }

            res.status(500).json({ error: 'Failed to upload image. Please try again.' });
        }
    }

    /**
     * Upload multiple images to Cloudinary
     */
    static async uploadMultipleImages(req, res) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No image files provided' });
            }

            // Upload all images to Cloudinary
            const uploadPromises = req.files.map(file =>
                uploadImage(file.buffer, 'kitchenpal/recipes')
            );

            const results = await Promise.all(uploadPromises);

            const imageData = results.map(result => ({
                imageUrl: result.secure_url,
                publicId: result.public_id,
            }));

            res.status(200).json({
                message: 'Images uploaded successfully',
                images: imageData,
            });
        } catch (error) {
            console.error('Upload multiple images error:', error);
            res.status(500).json({ error: 'Failed to upload images' });
        }
    }

    /**
     * Delete image from Cloudinary
     */
    static async deleteImage(req, res) {
        try {
            const { imageUrl, publicId } = req.body;

            let idToDelete = publicId;
            if (!idToDelete && imageUrl) {
                idToDelete = getPublicIdFromUrl(imageUrl);
            }

            if (!idToDelete) {
                return res.status(400).json({ error: 'No image identifier provided' });
            }

            const result = await deleteImage(idToDelete);

            res.status(200).json({
                message: 'Image deleted successfully',
                result,
            });
        } catch (error) {
            console.error('Delete image error:', error);
            res.status(500).json({ error: 'Failed to delete image' });
        }
    }
}

module.exports = UploadController;
