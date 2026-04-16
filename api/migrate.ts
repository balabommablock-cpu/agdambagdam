import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST with a secret
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-migrate-secret'] || req.query.secret;
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Set MIGRATE_SECRET env var and pass it in x-migrate-secret header.' });
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
    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'packages', 'server', 'src', 'db', 'schema.sql');
    let schema: string;
    try {
      schema = fs.readFileSync(schemaPath, 'utf-8');
    } catch {
      // Fallback: inline the schema for serverless environments
      schema = getInlineSchema();
    }

    await pool.query(schema);

    // Create default org and project if they don't exist
    const orgCheck = await pool.query('SELECT COUNT(*) as cnt FROM organizations');
    if (parseInt(orgCheck.rows[0].cnt) === 0) {
      const apiKey = 'abacus_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      await pool.query(
        "INSERT INTO organizations (name, api_key) VALUES ('Default', $1)",
        [apiKey]
      );

      const org = await pool.query('SELECT id FROM organizations LIMIT 1');
      await pool.query(
        "INSERT INTO projects (org_id, name) VALUES ($1, 'Default Project')",
        [org.rows[0].id]
      );

      const project = await pool.query('SELECT id FROM projects LIMIT 1');

      return res.json({
        success: true,
        message: 'Schema created and seeded',
        apiKey,
        orgId: org.rows[0].id,
        projectId: project.rows[0].id,
      });
    }

    // Return existing org info
    const org = await pool.query('SELECT id, api_key FROM organizations LIMIT 1');
    const project = await pool.query('SELECT id FROM projects LIMIT 1');

    return res.json({
      success: true,
      message: 'Schema applied (already seeded)',
      apiKey: org.rows[0].api_key,
      orgId: org.rows[0].id,
      projectId: project.rows[0]?.id,
    });
  } catch (err: any) {
    console.error('Migration failed:', err);
    return res.status(500).json({ error: 'Migration failed', details: err.message });
  } finally {
    await pool.end();
  }
}

function getInlineSchema(): string {
  return `
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  type TEXT NOT NULL DEFAULT 'ab',
  status TEXT NOT NULL DEFAULT 'draft',
  traffic_allocation REAL DEFAULT 1.0,
  targeting_rules JSONB DEFAULT '[]',
  mutual_exclusion_group TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, key)
);
CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0.5,
  payload JSONB DEFAULT '{}',
  is_control BOOLEAN DEFAULT false,
  UNIQUE(experiment_id, key)
);
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'conversion',
  aggregation TEXT NOT NULL DEFAULT 'sum',
  is_guardrail BOOLEAN DEFAULT false,
  minimum_detectable_effect REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, key)
);
CREATE TABLE IF NOT EXISTS experiment_metrics (
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  metric_id UUID REFERENCES metrics(id),
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (experiment_id, metric_id)
);
CREATE TABLE IF NOT EXISTS assignments (
  id BIGSERIAL PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id),
  user_id TEXT NOT NULL,
  variant_id UUID NOT NULL REFERENCES variants(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  context JSONB DEFAULT '{}',
  UNIQUE(experiment_id, user_id)
);
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  value REAL DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pre_experiment_data (
  experiment_id UUID REFERENCES experiments(id),
  user_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (experiment_id, user_id, metric_key)
);
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  default_value JSONB DEFAULT 'false',
  targeting_rules JSONB DEFAULT '[]',
  rollout_percentage REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, key)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignments_experiment_user ON assignments(experiment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_events_project_metric ON events(project_id, metric_key, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_experiments_project_status ON experiments(project_id, status);
CREATE INDEX IF NOT EXISTS idx_experiments_key ON experiments(project_id, key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(project_id, key);
  `;
}
