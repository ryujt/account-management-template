const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({
  origin: config.frontend.baseUrl,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.app.env
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NotFound',
      message: 'Route not found',
      details: {}
    }
  });
});

app.use(errorHandler);

const server = app.listen(config.app.port, () => {
  console.log(`🚀 Server running on port ${config.app.port} in ${config.app.env} mode`);
  console.log(`📧 Email provider: ${config.email.provider}`);
  console.log(`🗄️  DynamoDB table: ${config.dynamodb.table}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;