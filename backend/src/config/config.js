require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 5432,
        name: process.env.DATABASE_NAME || 'kitchenpal',
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres123',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:4200',
    },

    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
        uploadPath: process.env.UPLOAD_PATH || './uploads',
    },

    rag: {
        apiUrl: process.env.RAG_MODEL_API_URL || 'http://localhost:5000/api/rag',
        apiKey: process.env.RAG_MODEL_API_KEY,
    },

    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
};
