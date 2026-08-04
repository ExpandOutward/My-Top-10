const bcrypt = require('bcryptjs');
const { query } = require('./db');

const SALT_ROUNDS = 10;

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  next();
}

function normalizeUsername(value) {
  return (value || '').trim().toLowerCase();
}

function requireAdmin(req, res) {
  const adminSecret = process.env.ADMIN_SECRET;
  const provided = req.get('X-Admin-Secret') || '';

  if (!adminSecret || provided !== adminSecret) {
    res.status(403).json({
      error: 'Admin access required. Provide a valid X-Admin-Secret header.'
    });
    return false;
  }
  return true;
}

function getClientMeta(req) {
  // Prefer first hop when behind Render/proxy (x-forwarded-for can be a list)
  const forwarded = req.get('x-forwarded-for');
  let ip = null;
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (req.ip) {
    ip = req.ip;
  }

  return {
    ip: ip || null,
    userAgent: req.get('user-agent') || null
  };
}

/**
 * Records a session-related event for support/audit use.
 * Never throws to the caller — logging must not break login/logout.
 */
async function recordSessionEvent({ userId, username, eventType, ip, userAgent }) {
  try {
    await query(
      `INSERT INTO session_events (user_id, username, event_type, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, username || null, eventType, ip || null, userAgent || null]
    );
  } catch (err) {
    console.error('Session event log error:', err.message);
  }
}

function registerAuthRoutes(app) {
  // Create account (invite-only: requires ADMIN_SECRET header)
  app.post('/auth/register', async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const provided = req.get('X-Admin-Secret') || '';

      if (!adminSecret || provided !== adminSecret) {
        return res.status(403).json({
          error: 'Public registration is closed. Contact the site owner for an account.'
        });
      }

      // Accept username; also accept email for older Postman collections
      const username = normalizeUsername(req.body.username || req.body.email);
      const password = req.body.password || '';

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, created_at`,
        [username, passwordHash]
      );

      const user = result.rows[0];

      res.status(201).json({
        id: user.id,
        username: user.username,
        message: 'User created. They can log in with this username and password.'
      });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Username already taken' });
      }
      console.error('Register error:', err.message);
      res.status(500).json({ error: 'Could not register' });
    }
  });

  // Log in
  app.post('/auth/login', async (req, res) => {
    const username = normalizeUsername(req.body.username || req.body.email);
    const password = req.body.password || '';
    const { ip, userAgent } = getClientMeta(req);

    try {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await query(
        `SELECT id, username, password_hash FROM users WHERE username = $1`,
        [username]
      );

      const user = result.rows[0];
      if (!user) {
        await recordSessionEvent({
          userId: null,
          username,
          eventType: 'login_failed',
          ip,
          userAgent
        });
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        await recordSessionEvent({
          userId: user.id,
          username: user.username,
          eventType: 'login_failed',
          ip,
          userAgent
        });
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      await query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [user.id]
      );

      await recordSessionEvent({
        userId: user.id,
        username: user.username,
        eventType: 'login',
        ip,
        userAgent
      });

      res.json({
        id: user.id,
        username: user.username
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'Could not log in' });
    }
  });

  // Log out
  app.post('/auth/logout', async (req, res) => {
    // Must match cookie options used in express-session (see server.js)
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER),
      sameSite: 'lax'
    };

    const userId = req.session && req.session.userId;
    const username = req.session && req.session.username;
    const { ip, userAgent } = getClientMeta(req);

    if (userId || username) {
      await recordSessionEvent({
        userId: userId || null,
        username: username || null,
        eventType: 'logout',
        ip,
        userAgent
      });
    }

    if (!req.session) {
      res.clearCookie('connect.sid', cookieOptions);
      return res.json({ message: 'Logged out' });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.clearCookie('connect.sid', cookieOptions);
      res.json({ message: 'Logged out' });
    });
  });

  // Who am I?
  app.get('/auth/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    try {
      const result = await query(
        `SELECT id, username, created_at, last_login_at FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const user = result.rows[0];
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Not logged in' });
      }
      res.json(user);
    } catch (err) {
      console.error('Me error:', err.message);
      res.status(500).json({ error: 'Could not load user' });
    }
  });

  // Change password (logged-in user)
  app.post('/auth/change-password', requireAuth, async (req, res) => {
    try {
      const currentPassword = req.body.currentPassword || '';
      const newPassword = req.body.newPassword || '';

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'currentPassword and newPassword are required'
        });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      const result = await query(
        `SELECT id, password_hash FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Not logged in' });
      }

      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await query(
        `UPDATE users SET password_hash = $1 WHERE id = $2`,
        [passwordHash, req.session.userId]
      );

      res.json({ message: 'Password updated' });
    } catch (err) {
      console.error('Change password error:', err.message);
      res.status(500).json({ error: 'Could not change password' });
    }
  });

  /**
   * Support / admin: session activity history
   * Header: X-Admin-Secret
   * Query: username, user_id, event_type, limit (default 50, max 200)
   */
  app.get('/admin/session-events', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const username = normalizeUsername(req.query.username);
      const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
      const eventType = (req.query.event_type || '').trim().toLowerCase() || null;
      let limit = parseInt(req.query.limit, 10);
      if (Number.isNaN(limit) || limit < 1) limit = 50;
      if (limit > 200) limit = 200;

      const conditions = [];
      const params = [];

      if (username) {
        params.push(username);
        conditions.push(`username = $${params.length}`);
      }
      if (userId && !Number.isNaN(userId)) {
        params.push(userId);
        conditions.push(`user_id = $${params.length}`);
      }
      if (eventType) {
        params.push(eventType);
        conditions.push(`event_type = $${params.length}`);
      }

      params.push(limit);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, user_id, username, event_type, ip, user_agent, created_at
         FROM session_events
         ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params
      );

      res.json({
        count: result.rows.length,
        events: result.rows
      });
    } catch (err) {
      console.error('Session events query error:', err.message);
      res.status(500).json({ error: 'Could not load session events' });
    }
  });

  /**
   * Support / admin: quick user lookup including last login
   * Header: X-Admin-Secret
   * Query: username (required) or user_id
   */
  app.get('/admin/users/lookup', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const username = normalizeUsername(req.query.username);
      const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

      if (!username && (!userId || Number.isNaN(userId))) {
        return res.status(400).json({
          error: 'Provide username or user_id as a query parameter'
        });
      }

      let result;
      if (userId && !Number.isNaN(userId)) {
        result = await query(
          `SELECT id, username, created_at, last_login_at FROM users WHERE id = $1`,
          [userId]
        );
      } else {
        result = await query(
          `SELECT id, username, created_at, last_login_at FROM users WHERE username = $1`,
          [username]
        );
      }

      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const recent = await query(
        `SELECT id, event_type, ip, user_agent, created_at
         FROM session_events
         WHERE user_id = $1 OR username = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [user.id, user.username]
      );

      res.json({
        user,
        recent_events: recent.rows
      });
    } catch (err) {
      console.error('User lookup error:', err.message);
      res.status(500).json({ error: 'Could not look up user' });
    }
  });
}

module.exports = { registerAuthRoutes, requireAuth };
