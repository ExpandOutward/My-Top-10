const { query } = require('./db');

/**
 * Creates tables if they do not exist.
 * Safe to run on every server start.
 */
async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    );
  `);

  // Older installs may lack last_login_at
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'last_login_at'
      ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
      END IF;
    END $$;
  `);

  // Login/logout audit trail for support and troubleshooting
  await query(`
    CREATE TABLE IF NOT EXISTS session_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username TEXT,
      event_type TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS session_events_user_id_idx
    ON session_events (user_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS session_events_username_idx
    ON session_events (username);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS session_events_created_at_idx
    ON session_events (created_at DESC);
  `);

  // Migrate older installs that used "email" instead of "username"
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'email'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'username'
      ) THEN
        ALTER TABLE users RENAME COLUMN email TO username;
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS movies (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      year TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      year TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shows (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      year TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Ensure rank exists on older tables, backfill, then enforce uniqueness.
  for (const table of ['movies', 'games', 'shows']) {
    await ensureRankColumn(table);
  }
}

/**
 * Adds rank to an existing media table if missing, backfills per user by id order,
 * and applies UNIQUE (user_id, rank).
 */
async function ensureRankColumn(table) {
  const colCheck = await query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = 'rank'
    `,
    [table]
  );

  if (colCheck.rows.length === 0) {
    // Nullable first so we can backfill existing rows.
    await query(`ALTER TABLE ${table} ADD COLUMN rank INTEGER`);
  }

  // Backfill: if any row for a user has NULL rank, renumber that user's full list by id.
  // Avoids UNIQUE (user_id, rank) conflicts when only some ranks were null.
  await query(`
    WITH needs_fix AS (
      SELECT DISTINCT user_id
      FROM ${table}
      WHERE rank IS NULL
    ),
    numbered AS (
      SELECT
        t.id,
        ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.id) AS rn
      FROM ${table} t
      INNER JOIN needs_fix n ON n.user_id = t.user_id
    )
    UPDATE ${table} t
    SET rank = numbered.rn
    FROM numbered
    WHERE t.id = numbered.id
  `);

  // Guard against accidental NULLs after backfill.
  await query(`
    UPDATE ${table}
    SET rank = 1
    WHERE rank IS NULL
  `);

  await query(`
    ALTER TABLE ${table}
    ALTER COLUMN rank SET NOT NULL
  `);

  await query(`
    ALTER TABLE ${table}
    ALTER COLUMN rank SET DEFAULT 1
  `);

  // Unique rank per user per list (idempotent).
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${table}_user_id_rank_key'
      ) THEN
        ALTER TABLE ${table}
        ADD CONSTRAINT ${table}_user_id_rank_key UNIQUE (user_id, rank);
      END IF;
    END $$;
  `);
}

module.exports = { ensureSchema };
