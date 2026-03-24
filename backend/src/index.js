import 'dotenv/config';
import { resolve } from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDb } from 'account-management-shared/db';
import { initSchema } from 'account-management-shared/db/schema';
import { cleanupExpired } from 'account-management-shared/models/sessionModel';
import { errorHandler } from 'account-management-shared/middleware/errorHandler';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = resolve(process.env.DB_PATH || '../data/app.db');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || '900', 10);
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || '14', 10);

// Initialize database
const db = getDb(DB_PATH);
initSchema(db);

// Cleanup expired sessions on startup and every 10 minutes
cleanupExpired(db);
setInterval(() => cleanupExpired(db), 10 * 60 * 1000);

// Express app
const app = express();

// Store config on app for middleware access
app.set('jwtSecret', JWT_SECRET);
app.set('jwtExpiresIn', JWT_EXPIRES_IN);
app.set('sessionTtlDays', SESSION_TTL_DAYS);
app.set('db', db);

// Global middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

export default app;
