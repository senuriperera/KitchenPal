const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./middleware/passport');
const config = require('./config/config');
const db = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: config.frontend.url,
    credentials: true,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session(config.session));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Static files (for uploaded images)
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'KitchenPal API',
        version: '1.0.0',
        status: 'running',
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;

const startServer = async () => {
    try {
        // Test database connection
        await db.testConnection();

        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🍽️  KitchenPal Backend Server 🍽️             ║
║                                                       ║
║  Status: ✅ Running                                   ║
║  Port: ${PORT}                                       ║
║  Environment: ${config.nodeEnv}                      ║
║  Database: ✅ Connected                               ║
║                                                       ║
║  API Documentation: http://localhost:${PORT}/api      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

// Only start server if run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
