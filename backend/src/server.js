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
const { runExpiryNotificationsJob } = require('./cron/expiryNotificationsJob');
const { startAutoExpiryWasteLoggingJob } = require('./jobs/autoExpiryWasteLoggingJob');

const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
// Support comma-separated list of allowed frontend origins (e.g. admin + mobile web)
const allowedOrigins = config.frontend.url
    ? config.frontend.url.split(',').map(o => o.trim())
    : ['http://localhost:4200', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, mobile apps)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
}));

// Socket.IO setup (shares the same CORS allowlist)
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});

io.on('connection', (socket) => {
    console.log('🔌 WebSocket client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('🔌 WebSocket client disconnected:', socket.id);
    });
});

// Expose io so controllers can emit events
app.set('io', io);

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

        server.listen(PORT, () => {
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
            // Schedule daily expiry notifications job at midnight server time
            scheduleDailyExpiryJob();
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    // In production, exit. In development, just log it
    if (config.nodeEnv === 'production') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    // In production, exit. In development, just log it
    if (config.nodeEnv === 'production') {
        process.exit(1);
    }
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

// Schedule the daily cron job (runs at 00:00 every day)
function scheduleDailyExpiryJob() {
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('⏰ Cron: starting daily expiry notifications job');
            await runExpiryNotificationsJob();
        } catch (err) {
            console.error('❌ Cron: expiry notifications job failed', err);
        }
    });

    // Also start the auto-expiry waste logging job
    startAutoExpiryWasteLoggingJob();
}
