-- Abacus A/B Testing Platform — Database Schema

-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects within an org
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Experiments
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

-- Variants (control + treatments)
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

-- Metrics (what we measure)
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

-- Experiment-Metric mapping
CREATE TABLE IF NOT EXISTS experiment_metrics (
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  metric_id UUID REFERENCES metrics(id),
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (experiment_id, metric_id)
);

-- Assignments (which user got which variant)
CREATE TABLE IF NOT EXISTS assignments (
  id BIGSERIAL PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id),
  user_id TEXT NOT NULL,
  variant_id UUID NOT NULL REFERENCES variants(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  context JSONB DEFAULT '{}',
  UNIQUE(experiment_id, user_id)
);

-- Events (conversions, revenue, etc.)
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  value REAL DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Pre-experiment data (for CUPED)
CREATE TABLE IF NOT EXISTS pre_experiment_data (
  experiment_id UUID REFERENCES experiments(id),
  user_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (experiment_id, user_id, metric_key)
);

-- Feature flags
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

-- Audit log
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_experiment_user ON assignments(experiment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_events_project_metric ON events(project_id, metric_key, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_experiments_project_status ON experiments(project_id, status);
CREATE INDEX IF NOT EXISTS idx_experiments_key ON experiments(project_id, key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(project_id, key);
