import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { getExperimentResults } from '../services/results';
import { clearExperimentCache } from '../services/assignment';

function paramId(req: Request): string {
  const id = paramId(req);
  return Array.isArray(id) ? id[0] : id;
}

const router = Router();
router.use(authenticate);

// --- Schemas ---

const createExperimentSchema = z.object({
  key: z.string().min(1).max(128).regex(/^[a-z0-9_-]+$/, 'Key must be lowercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  type: z.enum(['ab', 'multivariate', 'bandit', 'feature_flag']).default('ab'),
  traffic_allocation: z.number().min(0).max(1).default(1.0),
  targeting_rules: z.array(z.any()).default([]),
  mutual_exclusion_group: z.string().optional(),
  variants: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    weight: z.number().min(0).max(1),
    payload: z.any().default({}),
    is_control: z.boolean().default(false),
  })).min(2),
  metric_ids: z.array(z.string().uuid()).optional(),
  primary_metric_id: z.string().uuid().optional(),
});

const updateExperimentSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  traffic_allocation: z.number().min(0).max(1).optional(),
  targeting_rules: z.array(z.any()).optional(),
  mutual_exclusion_group: z.string().nullable().optional(),
  variants: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    weight: z.number().min(0).max(1),
    payload: z.any().default({}),
    is_control: z.boolean().default(false),
  })).min(2).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

// --- Routes ---

// GET /api/experiments — list experiments for project
router.get('/', async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id header or query param.' });
    return;
  }

  const status = req.query.status as string | undefined;
  let sql = 'SELECT * FROM experiments WHERE project_id = $1';
  const params: any[] = [projectId];

  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';

  const experiments = await query(sql, params);
  res.json({ experiments });
});

// POST /api/experiments — create experiment
router.post('/', validate({ body: createExperimentSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id.' });
    return;
  }

  const body = req.body;

  // Validate variant weights sum to ~1
  const weightSum = body.variants.reduce((s: number, v: any) => s + v.weight, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    res.status(400).json({ error: `Variant weights must sum to 1.0, got ${weightSum}` });
    return;
  }

  // Create experiment
  const experiment = await queryOne(
    `INSERT INTO experiments (project_id, key, name, description, hypothesis, type, traffic_allocation, targeting_rules, mutual_exclusion_group)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [projectId, body.key, body.name, body.description || null, body.hypothesis || null,
     body.type, body.traffic_allocation, JSON.stringify(body.targeting_rules),
     body.mutual_exclusion_group || null]
  );

  if (!experiment) {
    res.status(500).json({ error: 'Failed to create experiment.' });
    return;
  }

  // Create variants
  const variants = [];
  for (const v of body.variants) {
    const variant = await queryOne(
      `INSERT INTO variants (experiment_id, key, name, weight, payload, is_control)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [experiment.id, v.key, v.name, v.weight, JSON.stringify(v.payload), v.is_control]
    );
    variants.push(variant);
  }

  // Link metrics
  if (body.metric_ids) {
    for (const metricId of body.metric_ids) {
      await queryOne(
        `INSERT INTO experiment_metrics (experiment_id, metric_id, is_primary)
         VALUES ($1, $2, $3)`,
        [experiment.id, metricId, metricId === body.primary_metric_id]
      );
    }
  }

  res.status(201).json({ experiment: { ...experiment, variants } });
});

// GET /api/experiments/:id — get experiment details
router.get('/:id', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const experiment = await queryOne(
    'SELECT * FROM experiments WHERE id = $1',
    [paramId(req)]
  );

  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }

  const variants = await query(
    'SELECT * FROM variants WHERE experiment_id = $1 ORDER BY is_control DESC, key',
    [paramId(req)]
  );

  const metrics = await query(
    `SELECT m.*, em.is_primary
     FROM experiment_metrics em
     JOIN metrics m ON m.id = em.metric_id
     WHERE em.experiment_id = $1`,
    [paramId(req)]
  );

  res.json({ experiment: { ...experiment, variants, metrics } });
});

// PUT /api/experiments/:id — update experiment
router.put('/:id', validate({ params: idParamSchema, body: updateExperimentSchema }), async (req: Request, res: Response) => {
  const existing = await queryOne<{ status: string; project_id: string; key: string }>(
    'SELECT status, project_id, key FROM experiments WHERE id = $1',
    [paramId(req)]
  );

  if (!existing) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }

  const body = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  for (const field of ['name', 'description', 'hypothesis', 'traffic_allocation', 'mutual_exclusion_group'] as const) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${paramIdx}`);
      params.push(body[field]);
      paramIdx++;
    }
  }

  if (body.targeting_rules !== undefined) {
    updates.push(`targeting_rules = $${paramIdx}`);
    params.push(JSON.stringify(body.targeting_rules));
    paramIdx++;
  }

  if (updates.length > 0) {
    updates.push(`updated_at = now()`);
    params.push(paramId(req));
    await queryOne(
      `UPDATE experiments SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );
  }

  // Update variants if provided
  if (body.variants) {
    const weightSum = body.variants.reduce((s: number, v: any) => s + v.weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      res.status(400).json({ error: `Variant weights must sum to 1.0, got ${weightSum}` });
      return;
    }

    // Delete old variants and recreate (only allowed in draft)
    if (existing.status === 'draft') {
      await query('DELETE FROM variants WHERE experiment_id = $1', [paramId(req)]);
      for (const v of body.variants) {
        await queryOne(
          `INSERT INTO variants (experiment_id, key, name, weight, payload, is_control)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [paramId(req), v.key, v.name, v.weight, JSON.stringify(v.payload), v.is_control]
        );
      }
    } else {
      res.status(400).json({ error: 'Cannot modify variants after experiment has started.' });
      return;
    }
  }

  clearExperimentCache(existing.project_id, existing.key);

  const updated = await queryOne('SELECT * FROM experiments WHERE id = $1', [paramId(req)]);
  const variants = await query('SELECT * FROM variants WHERE experiment_id = $1', [paramId(req)]);
  res.json({ experiment: { ...updated, variants } });
});

// POST /api/experiments/:id/start
router.post('/:id/start', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const experiment = await queryOne<{ status: string; project_id: string; key: string }>(
    'SELECT status, project_id, key FROM experiments WHERE id = $1',
    [paramId(req)]
  );

  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }
  if (experiment.status !== 'draft' && experiment.status !== 'paused') {
    res.status(400).json({ error: `Cannot start experiment in '${experiment.status}' status.` });
    return;
  }

  // Ensure experiment has variants
  const variants = await query('SELECT id FROM variants WHERE experiment_id = $1', [paramId(req)]);
  if (variants.length < 2) {
    res.status(400).json({ error: 'Experiment needs at least 2 variants to start.' });
    return;
  }

  const updated = await queryOne(
    `UPDATE experiments SET status = 'running', start_date = COALESCE(start_date, now()), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [paramId(req)]
  );

  clearExperimentCache(experiment.project_id, experiment.key);
  res.json({ experiment: updated });
});

// POST /api/experiments/:id/pause
router.post('/:id/pause', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const experiment = await queryOne<{ status: string; project_id: string; key: string }>(
    'SELECT status, project_id, key FROM experiments WHERE id = $1',
    [paramId(req)]
  );

  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }
  if (experiment.status !== 'running') {
    res.status(400).json({ error: 'Can only pause running experiments.' });
    return;
  }

  const updated = await queryOne(
    `UPDATE experiments SET status = 'paused', updated_at = now() WHERE id = $1 RETURNING *`,
    [paramId(req)]
  );

  clearExperimentCache(experiment.project_id, experiment.key);
  res.json({ experiment: updated });
});

// POST /api/experiments/:id/complete
router.post('/:id/complete', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const experiment = await queryOne<{ status: string; project_id: string; key: string }>(
    'SELECT status, project_id, key FROM experiments WHERE id = $1',
    [paramId(req)]
  );

  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }
  if (experiment.status !== 'running' && experiment.status !== 'paused') {
    res.status(400).json({ error: `Cannot complete experiment in '${experiment.status}' status.` });
    return;
  }

  const updated = await queryOne(
    `UPDATE experiments SET status = 'completed', end_date = now(), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [paramId(req)]
  );

  clearExperimentCache(experiment.project_id, experiment.key);
  res.json({ experiment: updated });
});

// GET /api/experiments/:id/results
router.get('/:id/results', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  try {
    const results = await getExperimentResults(paramId(req));
    res.json({ results });
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      res.status(404).json({ error: err.message });
    } else {
      throw err;
    }
  }
});

// DELETE /api/experiments/:id — archive experiment
router.delete('/:id', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const experiment = await queryOne<{ project_id: string; key: string }>(
    'SELECT project_id, key FROM experiments WHERE id = $1',
    [paramId(req)]
  );

  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }

  await queryOne(
    `UPDATE experiments SET status = 'archived', updated_at = now() WHERE id = $1`,
    [paramId(req)]
  );

  clearExperimentCache(experiment.project_id, experiment.key);
  res.status(200).json({ message: 'Experiment archived.' });
});

export default router;
