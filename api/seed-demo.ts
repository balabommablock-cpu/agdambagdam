/**
 * POST /api/seed-demo
 *
 * Idempotently seeds the public-demo account so anyone reading the landing-page
 * quickstart can actually run it. Creates (if missing):
 *
 *   - organization: "Agdam Bagdam — Public Demo" with api_key = "demo-public-key"
 *   - project:      "Public Demo (shared)"
 *   - metric:       "signup-click" (conversion)
 *   - experiment:   "button-color-test" (status = running)
 *   - variants:     control (blue), green — 50/50 traffic
 *
 * Requires `x-migrate-secret: <MIGRATE_SECRET env var>` to prevent anyone from
 * re-triggering the seed. Everything is INSERT ... ON CONFLICT DO NOTHING so
 * repeat calls are safe.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-migrate-secret'] || req.query.secret;
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized. Set MIGRATE_SECRET env var and pass it in x-migrate-secret header.',
    });
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not set' });
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    // 1. Org
    await pool.query(
      `INSERT INTO organizations (name, api_key)
       VALUES ('Agdam Bagdam — Public Demo', 'demo-public-key')
       ON CONFLICT (api_key) DO NOTHING`,
    );
    const orgR = await pool.query<{ id: string }>(
      `SELECT id FROM organizations WHERE api_key = 'demo-public-key'`,
    );
    const orgId = orgR.rows[0]?.id;
    if (!orgId) throw new Error('Failed to resolve demo org id after insert');

    // 2. Project
    let projectR = await pool.query<{ id: string }>(
      `SELECT id FROM projects WHERE org_id = $1 AND name = 'Public Demo (shared)' LIMIT 1`,
      [orgId],
    );
    if (projectR.rows.length === 0) {
      projectR = await pool.query<{ id: string }>(
        `INSERT INTO projects (org_id, name) VALUES ($1, 'Public Demo (shared)') RETURNING id`,
        [orgId],
      );
    }
    const projectId = projectR.rows[0].id;

    // 3. Metric (signup-click)
    await pool.query(
      `INSERT INTO metrics (project_id, key, name, type, aggregation)
       VALUES ($1, 'signup-click', 'Signup Clicks', 'conversion', 'sum')
       ON CONFLICT (project_id, key) DO NOTHING`,
      [projectId],
    );
    const metricR = await pool.query<{ id: string }>(
      `SELECT id FROM metrics WHERE project_id = $1 AND key = 'signup-click'`,
      [projectId],
    );
    const metricId = metricR.rows[0]?.id;

    // 4. Experiment (button-color-test)
    await pool.query(
      `INSERT INTO experiments (project_id, key, name, description, type, status, traffic_allocation)
       VALUES ($1, 'button-color-test', 'Button color — blue vs green',
               'The public quickstart example. Feel free to hit this with demo-public-key — it''s read-mostly and rate-limited.',
               'ab', 'running', 1.0)
       ON CONFLICT (project_id, key) DO NOTHING`,
      [projectId],
    );
    const expR = await pool.query<{ id: string }>(
      `SELECT id FROM experiments WHERE project_id = $1 AND key = 'button-color-test'`,
      [projectId],
    );
    const expId = expR.rows[0]?.id;

    // 5. Variants — control (blue) + green
    await pool.query(
      `INSERT INTO variants (experiment_id, key, name, weight, is_control)
       VALUES ($1, 'control', 'Blue button', 0.5, TRUE)
       ON CONFLICT (experiment_id, key) DO NOTHING`,
      [expId],
    );
    await pool.query(
      `INSERT INTO variants (experiment_id, key, name, weight, is_control)
       VALUES ($1, 'green', 'Green button', 0.5, FALSE)
       ON CONFLICT (experiment_id, key) DO NOTHING`,
      [expId],
    );

    // 6. Attach metric to experiment
    if (metricId && expId) {
      await pool.query(
        `INSERT INTO experiment_metrics (experiment_id, metric_id, is_primary)
         VALUES ($1, $2, TRUE)
         ON CONFLICT DO NOTHING`,
        [expId, metricId],
      );
    }

    // 7. Seed a feature flag the docs can demo
    await pool.query(
      `INSERT INTO feature_flags (project_id, key, name, description, enabled, default_value, rollout_percentage)
       VALUES ($1, 'new-onboarding', 'New onboarding flow',
               'Example feature flag for the public demo. 50% rollout.',
               TRUE, 'false'::jsonb, 50)
       ON CONFLICT (project_id, key) DO NOTHING`,
      [projectId],
    );

    return res.json({
      success: true,
      message: 'Public demo seed is up to date',
      demoApiKey: 'demo-public-key',
      orgId,
      projectId,
      experimentKey: 'button-color-test',
      variantKeys: ['control', 'green'],
      metricKey: 'signup-click',
      flagKey: 'new-onboarding',
      note: 'This is a shared public account. Rate-limited. Not for real customer data.',
    });
  } catch (err: any) {
    console.error('Seed failed:', err);
    return res
      .status(500)
      .json({ error: 'Seed failed', details: err.message, stack: err.stack });
  } finally {
    await pool.end();
  }
}
