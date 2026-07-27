const { query, getPool } = require('./db');
const { requireAuth } = require('./auth');

const RESOURCES = ['movies', 'games', 'shows'];
const MIN_RANK = 1;
const MAX_RANK = 10;
/** Temporary rank outside 1–10 so shifts do not hit UNIQUE (user_id, rank). */
const TEMP_RANK = 0;

function parseRank(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < MIN_RANK || n > MAX_RANK) {
    return undefined; // invalid
  }
  return n;
}

/**
 * Lowest unused rank in 1–10 for this user, or null if the list is full.
 */
async function nextAvailableRank(resource, userId) {
  const result = await query(
    `
    SELECT s.r AS rank
    FROM generate_series($1, $2) AS s(r)
    WHERE NOT EXISTS (
      SELECT 1 FROM ${resource}
      WHERE user_id = $3 AND rank = s.r
    )
    ORDER BY s.r
    LIMIT 1
    `,
    [MIN_RANK, MAX_RANK, userId]
  );
  return result.rows.length ? result.rows[0].rank : null;
}

/**
 * Move ranks so newRank is free for this user, then set the item's rank.
 * Uses a single client transaction so UNIQUE (user_id, rank) stays consistent.
 *
 * Shifts use a temporary +100 offset so intermediate rows never collide on
 * UNIQUE (user_id, rank) while ranks move by ±1.
 */
async function shiftRanksAndSet(resource, userId, itemId, oldRank, newRank) {
  if (oldRank === newRank) {
    return;
  }

  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Free unique slot: park this row at TEMP_RANK while others shift.
    await client.query(
      `UPDATE ${resource} SET rank = $1 WHERE id = $2 AND user_id = $3`,
      [TEMP_RANK, itemId, userId]
    );

    if (newRank < oldRank) {
      // Moving up: items at newRank .. oldRank-1 shift down (+1).
      await client.query(
        `
        UPDATE ${resource}
        SET rank = rank + 100
        WHERE user_id = $1
          AND rank >= $2
          AND rank < $3
        `,
        [userId, newRank, oldRank]
      );
      // rank was r+100; want r+1 → subtract 99
      await client.query(
        `
        UPDATE ${resource}
        SET rank = rank - 99
        WHERE user_id = $1
          AND rank >= $2
          AND rank < $3
        `,
        [userId, newRank + 100, oldRank + 100]
      );
    } else {
      // Moving down: items at oldRank+1 .. newRank shift up (-1).
      await client.query(
        `
        UPDATE ${resource}
        SET rank = rank + 100
        WHERE user_id = $1
          AND rank > $2
          AND rank <= $3
        `,
        [userId, oldRank, newRank]
      );
      // rank was r+100; want r-1 → subtract 101
      await client.query(
        `
        UPDATE ${resource}
        SET rank = rank - 101
        WHERE user_id = $1
          AND rank > $2
          AND rank <= $3
        `,
        [userId, oldRank + 100, newRank + 100]
      );
    }

    await client.query(
      `UPDATE ${resource} SET rank = $1 WHERE id = $2 AND user_id = $3`,
      [newRank, itemId, userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}

function registerMediaRoutes(app) {
  for (const resource of RESOURCES) {
    // List current user's items
    app.get(`/${resource}`, requireAuth, async (req, res) => {
      try {
        const result = await query(
          `SELECT id, title, genre, year, rank
           FROM ${resource}
           WHERE user_id = $1
           ORDER BY rank ASC`,
          [req.session.userId]
        );
        res.json(result.rows);
      } catch (err) {
        console.error(`GET /${resource}:`, err.message);
        res.status(500).json({ error: `Could not load ${resource}` });
      }
    });

    // Create
    app.post(`/${resource}`, requireAuth, async (req, res) => {
      try {
        const title = (req.body.title || '').trim();
        const genre = (req.body.genre || '').trim();
        const year = String(req.body.year || '').trim();

        if (!title || !genre || !year) {
          return res.status(400).json({ error: 'title, genre, and year are required' });
        }

        const countResult = await query(
          `SELECT COUNT(*)::int AS count FROM ${resource} WHERE user_id = $1`,
          [req.session.userId]
        );
        if (countResult.rows[0].count >= MAX_RANK) {
          return res.status(400).json({
            error: `Maximum of 10 ${resource} allowed`
          });
        }

        const rank = await nextAvailableRank(resource, req.session.userId);
        if (rank === null) {
          return res.status(400).json({
            error: `Maximum of 10 ${resource} allowed`
          });
        }

        const result = await query(
          `INSERT INTO ${resource} (user_id, title, genre, year, rank)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, title, genre, year, rank`,
          [req.session.userId, title, genre, year, rank]
        );

        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(`POST /${resource}:`, err.message);
        res.status(500).json({ error: `Could not create ${resource.slice(0, -1)}` });
      }
    });

    // Update (only own rows)
    app.put(`/${resource}/:id`, requireAuth, async (req, res) => {
      try {
        const id = Number(req.params.id);
        const title = (req.body.title || '').trim();
        const genre = (req.body.genre || '').trim();
        const year = String(req.body.year || '').trim();

        if (!title || !genre || !year) {
          return res.status(400).json({ error: 'title, genre, and year are required' });
        }

        let newRank = null;
        if (Object.prototype.hasOwnProperty.call(req.body, 'rank')) {
          newRank = parseRank(req.body.rank);
          if (newRank === undefined) {
            return res.status(400).json({
              error: `rank must be an integer between ${MIN_RANK} and ${MAX_RANK}`
            });
          }
        }

        const existing = await query(
          `SELECT id, rank FROM ${resource} WHERE id = $1 AND user_id = $2`,
          [id, req.session.userId]
        );

        if (existing.rows.length === 0) {
          return res.status(404).json({ error: 'Not found' });
        }

        const oldRank = existing.rows[0].rank;

        if (newRank !== null && newRank !== oldRank) {
          await shiftRanksAndSet(
            resource,
            req.session.userId,
            id,
            oldRank,
            newRank
          );
        }

        const result = await query(
          `UPDATE ${resource}
           SET title = $1, genre = $2, year = $3
           WHERE id = $4 AND user_id = $5
           RETURNING id, title, genre, year, rank`,
          [title, genre, year, id, req.session.userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Not found' });
        }

        res.json(result.rows[0]);
      } catch (err) {
        console.error(`PUT /${resource}/:id:`, err.message);
        res.status(500).json({ error: 'Could not update item' });
      }
    });

    // Delete (only own rows)
    app.delete(`/${resource}/:id`, requireAuth, async (req, res) => {
      try {
        const id = Number(req.params.id);
        const result = await query(
          `DELETE FROM ${resource}
           WHERE id = $1 AND user_id = $2
           RETURNING id`,
          [id, req.session.userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Not found' });
        }

        res.status(200).json({ message: 'Deleted' });
      } catch (err) {
        console.error(`DELETE /${resource}/:id:`, err.message);
        res.status(500).json({ error: 'Could not delete item' });
      }
    });
  }
}

module.exports = { registerMediaRoutes };
