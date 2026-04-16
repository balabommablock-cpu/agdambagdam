/**
 * @abacus/server — Integration test suite
 *
 * Tests the API server against a real PostgreSQL database.
 * Requires: DATABASE_URL="postgres://abacus:abacus_dev@localhost:5432/abacus"
 *
 * Uses Node.js built-in test runner (node:test + node:assert).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';

const BASE_URL = 'http://localhost:3456';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://abacus:abacus_dev@localhost:5432/abacus';

// We create a test org/project directly in the DB for isolation
let pool: Pool;
let testApiKey: string;
let testOrgId: string;
let testProjectId: string;
let testExperimentId: string;

// Helper to make HTTP requests
async function api(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>,
): Promise<{ status: number; body: any }> {
  const url = `${BASE_URL}${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let json: any;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

function authHeaders(projectId?: string): Record<string, string> {
  const h: Record<string, string> = { 'x-api-key': testApiKey };
  if (projectId) h['x-project-id'] = projectId;
  return h;
}

// ──────────────────────────────────────────────
//  Setup and teardown
// ──────────────────────────────────────────────

before(async () => {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: false,
  });

  // Generate a unique test API key to avoid collisions
  testApiKey = `test-key-${Date.now()}-${Math.random().toString(36).substring(2)}`;

  // Create test org
  const orgResult = await pool.query(
    `INSERT INTO organizations (name, api_key)
     VALUES ('Test Org', $1)
     RETURNING id`,
    [testApiKey],
  );
  testOrgId = orgResult.rows[0].id;

  // Create test project
  const projResult = await pool.query(
    `INSERT INTO projects (org_id, name)
     VALUES ($1, 'Test Project')
     RETURNING id`,
    [testOrgId],
  );
  testProjectId = projResult.rows[0].id;
});

after(async () => {
  // Clean up test data in dependency order
  if (pool) {
    try {
      // Delete assignments, events, variants, experiment_metrics, experiments, feature_flags, metrics
      await pool.query(`DELETE FROM assignments WHERE experiment_id IN (SELECT id FROM experiments WHERE project_id = $1)`, [testProjectId]);
      await pool.query(`DELETE FROM events WHERE project_id = $1`, [testProjectId]);
      await pool.query(`DELETE FROM experiment_metrics WHERE experiment_id IN (SELECT id FROM experiments WHERE project_id = $1)`, [testProjectId]);
      await pool.query(`DELETE FROM variants WHERE experiment_id IN (SELECT id FROM experiments WHERE project_id = $1)`, [testProjectId]);
      await pool.query(`DELETE FROM experiments WHERE project_id = $1`, [testProjectId]);
      await pool.query(`DELETE FROM feature_flags WHERE project_id = $1`, [testProjectId]);
      await pool.query(`DELETE FROM metrics WHERE project_id = $1`, [testProjectId]);
      await pool.query(`DELETE FROM projects WHERE id = $1`, [testProjectId]);
      await pool.query(`DELETE FROM organizations WHERE id = $1`, [testOrgId]);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
    await pool.end();
  }
});

// ──────────────────────────────────────────────
//  Health endpoint
// ──────────────────────────────────────────────

describe('Health endpoint', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await api('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'agdam-bagdam');
    assert.ok(res.body.timestamp, 'Should include timestamp');
  });
});

// ──────────────────────────────────────────────
//  Authentication
// ──────────────────────────────────────────────

describe('Authentication', () => {
  it('No API key -> 401', async () => {
    const res = await api('GET', '/api/experiments', undefined, {
      'x-project-id': testProjectId,
    });
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error.includes('Missing API key'));
  });

  it('Wrong API key -> 401', async () => {
    const res = await api('GET', '/api/experiments', undefined, {
      'x-api-key': 'invalid-key-that-does-not-exist',
      'x-project-id': testProjectId,
    });
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error.includes('Invalid API key'));
  });

  it('Valid API key -> not 401', async () => {
    const res = await api('GET', '/api/experiments', undefined, authHeaders(testProjectId));
    assert.notStrictEqual(res.status, 401);
  });
});

// ──────────────────────────────────────────────
//  Experiment CRUD
// ──────────────────────────────────────────────

describe('Experiment CRUD', () => {
  it('POST /api/experiments — create experiment', async () => {
    const uniqueKey = `test-exp-${Date.now()}`;
    const res = await api('POST', '/api/experiments', {
      key: uniqueKey,
      name: 'Test Experiment',
      description: 'Integration test',
      hypothesis: 'Button color affects CTR',
      type: 'ab',
      traffic_allocation: 1.0,
      variants: [
        { key: 'control', name: 'Control', weight: 0.5, is_control: true },
        { key: 'treatment', name: 'Treatment', weight: 0.5, is_control: false },
      ],
    }, authHeaders(testProjectId));

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.experiment);
    assert.ok(res.body.experiment.id);
    assert.strictEqual(res.body.experiment.key, uniqueKey);
    assert.strictEqual(res.body.experiment.status, 'draft');
    assert.ok(res.body.experiment.variants.length === 2);

    testExperimentId = res.body.experiment.id;
  });

  it('GET /api/experiments/:id — get experiment', async () => {
    const res = await api('GET', `/api/experiments/${testExperimentId}`, undefined, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.experiment.id, testExperimentId);
    assert.ok(res.body.experiment.variants.length >= 2);
  });

  it('PUT /api/experiments/:id — update experiment', async () => {
    const res = await api('PUT', `/api/experiments/${testExperimentId}`, {
      name: 'Updated Test Experiment',
      description: 'Updated description',
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.experiment.name, 'Updated Test Experiment');
  });

  it('POST /api/experiments/:id/start — start experiment', async () => {
    const res = await api('POST', `/api/experiments/${testExperimentId}/start`, {}, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.experiment.status, 'running');
  });

  it('GET /api/experiments/:id/results — get results', async () => {
    const res = await api('GET', `/api/experiments/${testExperimentId}/results`, undefined, authHeaders(testProjectId));
    // Results may be empty but endpoint should work
    assert.ok(res.status === 200 || res.status === 404,
      `Expected 200 or 404, got ${res.status}`);
  });

  it('GET /api/experiments — list experiments', async () => {
    const res = await api('GET', '/api/experiments', undefined, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.experiments));
    assert.ok(res.body.experiments.length >= 1);
  });
});

// ──────────────────────────────────────────────
//  Assignment
// ──────────────────────────────────────────────

describe('Assignment', () => {
  it('Deterministic: same user gets same variant every time', async () => {
    const experimentKey = (await pool.query(
      'SELECT key FROM experiments WHERE id = $1', [testExperimentId],
    )).rows[0].key;

    const res1 = await api('POST', '/api/assign', {
      userId: 'deterministic-user-1',
      experimentKey,
    }, authHeaders(testProjectId));

    const res2 = await api('POST', '/api/assign', {
      userId: 'deterministic-user-1',
      experimentKey,
    }, authHeaders(testProjectId));

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res1.body.variant, res2.body.variant,
      'Same user should get same variant');
    assert.strictEqual(res1.body.inExperiment, true);
  });

  it('Different users may get different variants', async () => {
    const experimentKey = (await pool.query(
      'SELECT key FROM experiments WHERE id = $1', [testExperimentId],
    )).rows[0].key;

    const variants = new Set<string>();
    // With 20 users and 50/50 split, we should see both variants
    for (let i = 0; i < 20; i++) {
      const res = await api('POST', '/api/assign', {
        userId: `multi-user-${i}`,
        experimentKey,
      }, authHeaders(testProjectId));
      if (res.body.inExperiment) {
        variants.add(res.body.variant);
      }
    }
    assert.ok(variants.size >= 2,
      `Expected at least 2 different variants across 20 users, got ${variants.size}`);
  });

  it('Completed experiment returns existing assignments', async () => {
    const experimentKey = (await pool.query(
      'SELECT key FROM experiments WHERE id = $1', [testExperimentId],
    )).rows[0].key;

    // Assign a user while running
    const assignRes = await api('POST', '/api/assign', {
      userId: 'complete-test-user',
      experimentKey,
    }, authHeaders(testProjectId));
    assert.strictEqual(assignRes.body.inExperiment, true);
    const assignedVariant = assignRes.body.variant;

    // Complete the experiment
    await api('POST', `/api/experiments/${testExperimentId}/complete`, {}, authHeaders(testProjectId));

    // Re-assign — should return existing assignment
    const reAssignRes = await api('POST', '/api/assign', {
      userId: 'complete-test-user',
      experimentKey,
    }, authHeaders(testProjectId));
    assert.strictEqual(reAssignRes.body.variant, assignedVariant,
      'Completed experiment should return existing assignment');
    assert.strictEqual(reAssignRes.body.inExperiment, true);
  });
});

// ──────────────────────────────────────────────
//  Targeting
// ──────────────────────────────────────────────

describe('Targeting', () => {
  let targetedExpId: string;
  let targetedExpKey: string;

  before(async () => {
    targetedExpKey = `targeted-exp-${Date.now()}`;
    const res = await api('POST', '/api/experiments', {
      key: targetedExpKey,
      name: 'Targeted Experiment',
      type: 'ab',
      traffic_allocation: 1.0,
      targeting_rules: [
        {
          rules: [{ attribute: 'country', operator: 'eq', value: 'US' }],
          logic: 'and',
        },
      ],
      variants: [
        { key: 'control', name: 'Control', weight: 0.5, is_control: true },
        { key: 'treatment', name: 'Treatment', weight: 0.5, is_control: false },
      ],
    }, authHeaders(testProjectId));
    targetedExpId = res.body.experiment.id;

    // Start it
    await api('POST', `/api/experiments/${targetedExpId}/start`, {}, authHeaders(testProjectId));
  });

  it('Missing context does NOT bypass targeting rules', async () => {
    // No context at all — should not be assigned
    const res = await api('POST', '/api/assign', {
      userId: 'no-context-user',
      experimentKey: targetedExpKey,
    }, authHeaders(testProjectId));
    assert.strictEqual(res.body.inExperiment, false,
      'Missing context should not bypass targeting');
  });

  it('Wrong context does not match targeting', async () => {
    const res = await api('POST', '/api/assign', {
      userId: 'wrong-context-user',
      experimentKey: targetedExpKey,
      context: { country: 'UK' },
    }, authHeaders(testProjectId));
    assert.strictEqual(res.body.inExperiment, false,
      'Non-matching context should not be assigned');
  });

  it('Matching context allows assignment', async () => {
    const res = await api('POST', '/api/assign', {
      userId: 'us-user',
      experimentKey: targetedExpKey,
      context: { country: 'US' },
    }, authHeaders(testProjectId));
    assert.strictEqual(res.body.inExperiment, true,
      'Matching context should allow assignment');
  });
});

// ──────────────────────────────────────────────
//  Feature Flags
// ──────────────────────────────────────────────

describe('Feature Flags', () => {
  let flagId: string;
  const flagKey = `test-flag-${Date.now()}`;

  it('POST /api/flags — create flag', async () => {
    const res = await api('POST', '/api/flags', {
      key: flagKey,
      name: 'Test Flag',
      enabled: false,
      default_value: false,
      rollout_percentage: 100,
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.flag.id);
    flagId = res.body.flag.id;
  });

  it('POST /api/flags/:id/toggle — enable flag', async () => {
    const res = await api('POST', `/api/flags/${flagId}/toggle`, {}, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.flag.enabled, true);
  });

  it('POST /api/flags/evaluate — evaluate enabled flag', async () => {
    const res = await api('POST', '/api/flags/evaluate', {
      userId: 'flag-user-1',
      context: {},
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.flags.hasOwnProperty(flagKey),
      `Response should include flag '${flagKey}'`);
  });

  it('POST /api/flags/:id/toggle — disable flag', async () => {
    const res = await api('POST', `/api/flags/${flagId}/toggle`, {}, authHeaders(testProjectId));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.flag.enabled, false);
  });
});

// ──────────────────────────────────────────────
//  Events
// ──────────────────────────────────────────────

describe('Events', () => {
  it('POST /api/events — track single event', async () => {
    const res = await api('POST', '/api/events', {
      userId: 'event-user-1',
      metricKey: 'purchase',
      value: 42.50,
      properties: { currency: 'USD' },
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 202);
    assert.strictEqual(res.body.success, true);
  });

  it('POST /api/events/batch — track batch events', async () => {
    const res = await api('POST', '/api/events/batch', {
      events: [
        { userId: 'batch-user-1', metricKey: 'click', value: 1 },
        { userId: 'batch-user-2', metricKey: 'click', value: 1 },
        { userId: 'batch-user-3', metricKey: 'purchase', value: 99.99 },
      ],
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 202);
    assert.strictEqual(res.body.count, 3);
  });
});

// ──────────────────────────────────────────────
//  IDOR Protection
// ──────────────────────────────────────────────

describe('IDOR Protection', () => {
  it('Wrong project_id -> 404 for existing experiment', async () => {
    const fakeProjectId = '00000000-0000-0000-0000-000000000000';
    const res = await api('GET', `/api/experiments/${testExperimentId}`, undefined, {
      'x-api-key': testApiKey,
      'x-project-id': fakeProjectId,
    });
    assert.strictEqual(res.status, 404,
      `Expected 404 for wrong project_id, got ${res.status}`);
  });
});

// ──────────────────────────────────────────────
//  Validation
// ──────────────────────────────────────────────

describe('Input Validation', () => {
  it('Missing project_id -> 400', async () => {
    const res = await api('GET', '/api/experiments', undefined, {
      'x-api-key': testApiKey,
      // no project_id
    });
    assert.strictEqual(res.status, 400);
  });

  it('Invalid experiment key format -> 400', async () => {
    const res = await api('POST', '/api/experiments', {
      key: 'INVALID KEY WITH SPACES!',
      name: 'Bad Experiment',
      variants: [
        { key: 'control', name: 'Control', weight: 0.5, is_control: true },
        { key: 'treatment', name: 'Treatment', weight: 0.5, is_control: false },
      ],
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 400);
  });

  it('Variant weights not summing to 1 -> 400', async () => {
    const res = await api('POST', '/api/experiments', {
      key: `bad-weights-${Date.now()}`,
      name: 'Bad Weights',
      variants: [
        { key: 'control', name: 'Control', weight: 0.3, is_control: true },
        { key: 'treatment', name: 'Treatment', weight: 0.3, is_control: false },
      ],
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 400);
  });

  it('Fewer than 2 variants -> 400', async () => {
    const res = await api('POST', '/api/experiments', {
      key: `one-variant-${Date.now()}`,
      name: 'One Variant',
      variants: [
        { key: 'control', name: 'Control', weight: 1.0, is_control: true },
      ],
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 400);
  });

  it('Invalid UUID in path -> 400', async () => {
    const res = await api('GET', '/api/experiments/not-a-uuid', undefined, authHeaders(testProjectId));
    assert.strictEqual(res.status, 400);
  });

  it('Assignment with missing userId -> 400', async () => {
    const res = await api('POST', '/api/assign', {
      experimentKey: 'some-key',
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 400);
  });

  it('Event with missing metricKey -> 400', async () => {
    const res = await api('POST', '/api/events', {
      userId: 'user-1',
    }, authHeaders(testProjectId));
    assert.strictEqual(res.status, 400);
  });
});
