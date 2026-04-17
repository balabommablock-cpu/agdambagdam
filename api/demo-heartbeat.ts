/**
 * POST /api/demo-heartbeat
 *
 * Generates a fresh batch of fake assignments + conversion events for the
 * public demo experiment so the marketing iframe at boredfolio.com/agdambagdam
 * always shows recent activity instead of zeros.
 *
 * Hits the database directly (no HTTP round trip) so it's fast enough to run
 * on a Vercel cron every 15 minutes without burning function time.
 *
 * Auth options (any one):
 *   - Vercel Cron sends `authorization: Bearer ${CRON_SECRET}`
 *   - Manual call: `x-migrate-secret: ${MIGRATE_SECRET}`
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const DEMO_API_KEY = 'demo-public-key';
const EXPERIMENT_KEY = 'button-color-test';
const METRIC_KEY = 'signup-click';

// Per call: drop ~10–15 visitors into the experiment. Realistic enough to
// make the dashboard feel alive without spamming the database.
const MIN_VISITORS = 10;
const MAX_VISITORS = 15;

// Variant conversion rates. Skewed so green wins by ~50% relative lift —
// enough that the Bayesian readout will eventually call green the winner,
// which is the story the landing page wants to tell.
const CONV_RATES: Record<string, number> = {
  control: 0.082,
  green: 0.123,
};

function isAuthorized(req: VercelRequest): boolean {
  const auth = req.headers['authorization'];
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const migrate = req.headers['x-migrate-secret'] || req.query.secret;
  if (process.env.MIGRATE_SECRET && migrate === process.env.MIGRATE_SECRET) return true;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET so Vercel cron (which uses GET) can hit it; POST is fine too.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL not set' });

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    // Resolve project + experiment + variants + metric in one round trip.
    const ctxR = await pool.query<{
      project_id: string;
      experiment_id: string;
    }>(
      `SELECT p.id AS project_id, e.id AS experiment_id
       FROM organizations o
       JOIN projects p ON p.org_id = o.id
       JOIN experiments e ON e.project_id = p.id
       WHERE o.api_key = $1 AND e.key = $2
       LIMIT 1`,
      [DEMO_API_KEY, EXPERIMENT_KEY],
    );
    if (ctxR.rows.length === 0) {
      return res.status(404).json({
        error: 'Demo experiment not found. Run /api/seed-demo first.',
      });
    }
    const { project_id: projectId, experiment_id: experimentId } = ctxR.rows[0];

    const variantR = await pool.query<{ id: string; key: string }>(
      `SELECT id, key FROM variants WHERE experiment_id = $1`,
      [experimentId],
    );
    const variantsByKey = new Map(variantR.rows.map((v) => [v.key, v.id]));
    if (!variantsByKey.has('control') || !variantsByKey.has('green')) {
      return res.status(500).json({ error: 'Demo variants missing — re-seed.' });
    }

    // Pick how many fake visitors to spawn this tick.
    const n = Math.floor(Math.random() * (MAX_VISITORS - MIN_VISITORS + 1)) + MIN_VISITORS;

    let assignmentsInserted = 0;
    let eventsInserted = 0;

    // Assignments + (probabilistically) conversion events. Run sequentially
    // so we don't blow past the small connection pool.
    for (let i = 0; i < n; i++) {
      // Stable per-tick userId — random uuid, never the same across calls so
      // the assignments table grows steadily. The dashboard's "unique users"
      // metric is what makes activity legible.
      const userId = `demo-${randomUUID()}`;
      const variantKey = Math.random() < 0.5 ? 'control' : 'green';
      const variantId = variantsByKey.get(variantKey)!;

      const inserted = await pool.query(
        `INSERT INTO assignments (experiment_id, user_id, variant_id, context)
         VALUES ($1, $2, $3, '{}'::jsonb)
         ON CONFLICT (experiment_id, user_id) DO NOTHING
         RETURNING user_id`,
        [experimentId, userId, variantId],
      );
      if (inserted.rowCount && inserted.rowCount > 0) assignmentsInserted++;

      // Conversion event with variant-skewed probability.
      if (Math.random() < CONV_RATES[variantKey]) {
        await pool.query(
          `INSERT INTO events (project_id, user_id, metric_key, value, properties, timestamp)
           VALUES ($1, $2, $3, 1, $4::jsonb, now())`,
          [
            projectId,
            userId,
            METRIC_KEY,
            JSON.stringify({ variant: variantKey, source: 'demo-heartbeat' }),
          ],
        );
        eventsInserted++;
      }
    }

    return res.json({
      success: true,
      tickedAt: new Date().toISOString(),
      visitorsSpawned: n,
      assignmentsInserted,
      eventsInserted,
    });
  } catch (err: any) {
    console.error('demo-heartbeat failed:', err);
    return res
      .status(500)
      .json({ error: 'demo-heartbeat failed', details: err.message });
  } finally {
    await pool.end();
  }
}
