import 'dotenv/config';
import { resolve } from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDb } from 'account-management-shared/db';
import { initSchema } from 'account-management-shared/db/schema';
import { errorHandler } from 'account-management-shared/middleware/errorHandler';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';

const {
  PORT = 3001,
  DB_PATH = '../data/app.db',
  ADMIN_FRONTEND_URL = 'http://localhost:5174',
  JWT_SECRET = 'change-this-secret',
  JWT_EXPIRES_IN = '900',
  SESSION_TTL_DAYS = '14',
} = process.env;

/* ------------------------------------------------------------------ */
/*  Database                                                          */
/* ------------------------------------------------------------------ */

const dbPath = resolve(DB_PATH);
const db = getDb(dbPath);
initSchema(db);

/* ------------------------------------------------------------------ */
/*  Session cleanup                                                   */
/* ------------------------------------------------------------------ */

function cleanExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  const info = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  if (info.changes > 0) {
    console.log(`[cleanup] removed ${info.changes} expired session(s)`);
  }
}

cleanExpiredSessions();
setInterval(cleanExpiredSessions, 10 * 60 * 1000);

/* ------------------------------------------------------------------ */
/*  Express                                                           */
/* ------------------------------------------------------------------ */

const app = express();

// Store config on app for middleware/route access
app.set('db', db);
app.set('jwtSecret', JWT_SECRET);
app.set('jwtExpiresIn', parseInt(JWT_EXPIRES_IN, 10));
app.set('sessionTtlDays', parseInt(SESSION_TTL_DAYS, 10));

app.use(cors({
  origin: ADMIN_FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

/* ------------------------------------------------------------------ */
/*  Routes                                                            */
/* ------------------------------------------------------------------ */

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

/* ------------------------------------------------------------------ */
/*  Error handling                                                    */
/* ------------------------------------------------------------------ */

app.use(errorHandler);

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`[admin-backend] listening on http://localhost:${PORT}`);
});

export default app;
