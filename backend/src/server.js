require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Import configurations and adapters
const config = require('./config/config');
const db = require('./adapters/database');
const emailAdapter = require('./adapters/email');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Create Express application
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3001', // Service frontend
    'http://localhost:3002'  // Admin frontend
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later.'
  }
});

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging in development
if (config.app.env === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - ${req.ip}`);
    next();
  });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const emailHealth = await emailAdapter.testConnection();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        email: emailHealth
      },
      environment: config.app.env,
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/admin', adminRoutes);

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Account Management API',
    version: '1.0.0',
    description: 'REST API for account management with JWT authentication',
    endpoints: {
      auth: '/api/v1/auth',
      user: '/api/v1/user',
      admin: '/api/v1/admin'
    },
    documentation: 'https://github.com/your-repo/docs',
    health: '/health'
  });
});

// Handle 404 for API routes
app.use('/api/*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Connect to database
    await db.connect();
    
    // Start server
    const server = app.listen(config.app.port, () => {
      console.log(`🚀 Server running on port ${config.app.port} in ${config.app.env} mode`);
      console.log(`📧 Email provider: ${config.email.provider}`);
      console.log(`🗄️  Database: MySQL at ${config.database.host}:${config.database.port}`);
      console.log(`🌐 Frontend URL: ${config.frontend.baseUrl}`);
      console.log(`❤️  Health check: http://localhost:${config.app.port}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      server.close(async () => {
        try {
          await db.disconnect();
          console.log('✅ Server shut down successfully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log('⚠️  Force shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;