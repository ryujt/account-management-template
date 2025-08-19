require('dotenv').config();

const config = {
  app: {
    env: process.env.APP_ENV || 'local',
    port: parseInt(process.env.PORT) || 3000
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 900,
    sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS) || 14
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'account_management',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password'
  },
  email: {
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    provider: process.env.EMAIL_PROVIDER || 'stub'
  },
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
  }
};

module.exports = config;