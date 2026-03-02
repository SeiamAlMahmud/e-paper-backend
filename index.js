require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const dns = require('dns');
dns.setServers(['1.1.1.1']);

const app = express();
const PORT = process.env.PORT || 30001;

// Middleware
// Parse allowed origins from environment variable (comma-separated)
const allowedOrigins = ['http://localhost:30001', 'http://localhost:3000','https://epaper.varaniben.com', 'https://e-paper-system.vercel.app'];
// const allowedOrigins = process.env.FRONTEND_URL
//     ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
//     : ['http://localhost:30001', 'http://localhost:30000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'E-Paper Backend API is running' });
});
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'E-Paper Backend API is running' });
});

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/articles', require('./routes/articles.routes'));
app.use('/api/editions', require('./routes/editions.routes'));
app.use('/api/pages', require('./routes/pages.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/media', require('./routes/media.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/profile', require('./routes/profile.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/download', require('./routes/download.routes'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File size too large',
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            error: 'Unexpected file field',
        });
    }

    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await connectDB();

        // Start listening
        app.listen(PORT, () => {
            console.log(`\n🚀 E-Paper Backend Server`);
            console.log(`📡 Running on: http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: MongoDB connected`);
            console.log(`\n✅ Server is ready to accept requests\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
