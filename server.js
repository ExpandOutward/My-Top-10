const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const { checkConnection, getPool, query } = require('./db');
const { ensureSchema } = require('./schema');
const { registerAuthRoutes } = require('./auth');
const { registerMediaRoutes } = require('./media');

const app = express();

// Needed so secure cookies work behind Render's proxy
app.set('trust proxy', 1);

// Parse JSON bodies on POST/PUT
app.use(express.json());

// Sessions stored in Postgres when DATABASE_URL is available
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-only-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER),
    sameSite: 'lax'
  }
};

const pool = getPool();
if (pool) {
  sessionConfig.store = new pgSession({
    pool,
    createTableIfMissing: true
  });
}

app.use(session(sessionConfig));

registerAuthRoutes(app);
registerMediaRoutes(app);

app.get('/health', async (req, res) => {
  try {
    const db = await checkConnection();
    let tables = null;
    if (db.ok) {
      try {
        const result = await query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN ('users', 'movies', 'games', 'shows', 'session_events')
          ORDER BY table_name
        `);
        tables = result.rows.map((row) => row.table_name);
      } catch (tableErr) {
        tables = { error: tableErr.message };
      }
    }
    res.status(db.ok ? 200 : 503).json({
      status: db.ok ? 'ok' : 'degraded',
      database: db.ok ? 'connected' : 'error',
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      tables,
      error: db.error
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'error',
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      error: err.message || String(err)
    });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await ensureSchema();
    console.log('Database tables ready');
  } catch (err) {
    console.error('Failed to create database tables:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
