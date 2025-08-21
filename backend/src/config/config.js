require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'account_management',
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },

  // JWT
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret',
    accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    issuer: process.env.JWT_ISSUER || 'account-management'
  },

  // Session/Cookie
  session: {
    cookieMaxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days
    cookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
    cookieHttpOnly: true,
    cookieSameSite: process.env.SESSION_COOKIE_SAME_SITE || 'lax'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false
  },

  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },

  // OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/oauth/google/callback'
  },

  // Admin Bootstrap
  admin: {
    email: process.env.ADMIN_EMAIL,
    tempPassword: process.env.ADMIN_TEMP_PASSWORD
  },

  // Token Expiration (in milliseconds)
  tokenExpiration: {
    emailVerification: 24 * 60 * 60 * 1000, // 24 hours
    passwordReset: 60 * 60 * 1000, // 1 hour
    refreshToken: parseInt(process.env.REFRESH_TOKEN_EXPIRATION) || 7 * 24 * 60 * 60 * 1000 // 7 days
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    argon2: {
      type: 2, // argon2id
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST) || 65536, // 64 MB
      timeCost: parseInt(process.env.ARGON2_TIME_COST) || 3,
      parallelism: parseInt(process.env.ARGON2_PARALLELISM) || 4
    }
  }
};

// Validation
if (!config.jwt.accessTokenSecret || config.jwt.accessTokenSecret === 'your-access-token-secret') {
  console.warn('WARNING: Using default JWT access token secret. Please set JWT_ACCESS_SECRET in production!');
}

if (!config.jwt.refreshTokenSecret || config.jwt.refreshTokenSecret === 'your-refresh-token-secret') {
  console.warn('WARNING: Using default JWT refresh token secret. Please set JWT_REFRESH_SECRET in production!');
}

module.exports = config;