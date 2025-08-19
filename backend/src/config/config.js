require('dotenv').config();

module.exports = {
  app: {
    env: process.env.APP_ENV || 'local',
    port: parseInt(process.env.PORT || '3000', 10)
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '900', 10)
  },
  session: {
    ttlDays: parseInt(process.env.SESSION_TTL_DAYS || '14', 10)
  },
  dynamodb: {
    table: process.env.DDB_TABLE || 'ums-main',
    region: process.env.AWS_REGION || 'ap-northeast-2'
  },
  email: {
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    provider: process.env.EMAIL_PROVIDER || 'stub'
  },
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
  }
};