const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// Import configuration and database
const config = require('./config/config');
const database = require('./config/database');

// Import middleware
const { 
  errorHandler, 
  notFound, 
  requestLogger, 
  healthCheck 
} = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import services
const AuthService = require('./services/authService');
const { initializeModels } = require('./models');

// Create Express app
const app = express();

// Trust proxy if running behind reverse proxy (e.g., nginx, load balancer)
if (config.env === 'production') {
  app.set('trust proxy', 1);
}

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Disable for OAuth compatibility
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// CORS configuration
app.use(cors(config.cors));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Passport initialization (for OAuth)
app.use(passport.initialize());

// Request logging
if (config.env === 'development') {
  app.use(requestLogger);
}

// Global rate limiting
app.use(globalLimiter);

// Health check endpoint (before other routes to avoid rate limiting)
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Account Management API',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      admin: '/api/admin',
      health: '/health'
    }
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Account Management API v1',
    version: '1.0.0',
    documentation: 'https://docs.example.com/api',
    endpoints: {
      authentication: {
        base: '/api/auth',
        endpoints: [
          'POST /register',
          'POST /login',
          'POST /refresh',
          'POST /logout',
          'POST /verify-email',
          'POST /password/forgot',
          'POST /password/reset',
          'GET /oauth/google'
        ]
      },
      user: {
        base: '/api/user',
        endpoints: [
          'GET /profile',
          'PATCH /profile',
          'POST /password/change',
          'GET /sessions',
          'DELETE /sessions/:id',
          'GET /export'
        ]
      },
      admin: {
        base: '/api/admin',
        endpoints: [
          'GET /dashboard/stats',
          'GET /users',
          'GET /users/:id',
          'PATCH /users/:id',
          'POST /users/:id/roles',
          'DELETE /users/:id/roles/:role'
        ]
      }
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Perform cleanup operations
      await AuthService.cleanup();
      console.log('Auth service cleanup completed');
      
      // Close database connections
      await database.disconnect();
      console.log('Database connections closed');
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after timeout
  setTimeout(() => {
    console.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('Starting Account Management API...');
    console.log(`Environment: ${config.env}`);
    console.log(`Port: ${config.port}`);

    // Initialize database
    await database.initializeDatabase();
    await database.connect();

    // Initialize models and default data
    await initializeModels();

    // Initialize admin user if configured
    try {
      await AuthService.initializeAdmin();
    } catch (error) {
      console.error('Admin initialization error (non-critical):', error.message);
    }

    // Setup periodic cleanup
    const cleanupInterval = setInterval(async () => {
      try {
        await AuthService.cleanup();
      } catch (error) {
        console.error('Periodic cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Run cleanup every hour

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Server is running on port ${config.port}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health`);
      console.log(`📖 API documentation: http://localhost:${config.port}/api`);
      
      if (config.env === 'development') {
        console.log(`\n🔧 Development mode features:`);
        console.log(`- Request logging enabled`);
        console.log(`- Detailed error messages`);
        console.log(`- CORS enabled for: ${JSON.stringify(config.cors.origin)}`);
      }

      if (config.google.clientId) {
        console.log(`\n🔐 OAuth configured:`);
        console.log(`- Google OAuth available at: http://localhost:${config.port}/api/auth/oauth/google`);
      }

      console.log('\n✅ Server startup completed successfully\n');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle graceful shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Cleanup interval reference for shutdown
    process.cleanupInterval = cleanupInterval;
    
    return server;
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
let server;
if (require.main === module) {
  startServer().then(s => server = s);
}

// Export app for testing
module.exports = { app, startServer };