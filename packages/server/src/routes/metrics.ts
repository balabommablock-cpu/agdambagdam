import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { sendError } from '../lib/errors';

const router = Router();
router.use(authenticate);

// --- Schemas ---

const createMetricSchema = z.object({
  key: z.string().min(1).max(128).regex(/^[a-z0-9_-]+$/, 'Key must be lowercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  type: z.enum(['conversion', 'revenue', 'count', 'duration', 'custom']).default('conversion'),
  aggregation: z.enum(['sum', 'mean', 'count', 'unique', 'p90', 'p95']).default('sum'),
  is_guardrail: z.boolean().default(false),
  minimum_detectable_effect: z.number().positive().optional(),
});

const updateMetricSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  type: z.enum(['conversion', 'revenue', 'count', 'duration', 'custom']).optional(),
  aggregation: z.enum(['sum', 'mean', 'count', 'unique', 'p90', 'p95']).optional(),
  is_guardrail: z.boolean().optional(),
  minimum_detectable_effect: z.number().positive().nullable().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

// --- Routes ---

// GET /api/metrics — list metrics
router.get('/', async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const metrics = await query(
    'SELECT * FROM metrics WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );
  res.json({ metrics });
});

// POST /api/metrics — create metric
router.post('/', validate({ body: createMetricSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const body = req.body;
  const metric = await queryOne(
    `INSERT INTO metrics (project_id, key, name, description, type, aggregation, is_guardrail, minimum_detectable_effect)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [projectId, body.key, body.name, body.description || null,
     body.type, body.aggregation, body.is_guardrail,
     body.minimum_detectable_effect || null]
  );

  res.status(201).json({ metric });
});

// PUT /api/metrics/:id — update metric
router.put('/:id', validate({ params: idParamSchema, body: updateMetricSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const existing = await queryOne('SELECT id FROM metrics WHERE id = $1 AND project_id = $2', [req.params.id, projectId]);
  if (!existing) {
    sendError(res, 'METRIC_NOT_FOUND');
    return;
  }

  const body = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const field of ['name', 'description', 'type', 'aggregation', 'is_guardrail', 'minimum_detectable_effect'] as const) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx}`);
      params.push(body[field]);
      idx++;
    }
  }

  if (updates.length === 0) {
    const metric = await queryOne('SELECT * FROM metrics WHERE id = $1', [req.params.id]);
    res.json({ metric });
    return;
  }

  params.push(req.params.id);
  const metric = await queryOne(
    `UPDATE metrics SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );

  res.json({ metric });
});

// DELETE /api/metrics/:id — delete metric
router.delete('/:id', validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const existing = await queryOne('SELECT id FROM metrics WHERE id = $1 AND project_id = $2', [req.params.id, projectId]);
  if (!existing) {
    sendError(res, 'METRIC_NOT_FOUND');
    return;
  }

  // Check if metric is linked to any active experiments
  const linked = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM experiment_metrics em
     JOIN experiments e ON e.id = em.experiment_id
     WHERE em.metric_id = $1 AND e.status IN ('running', 'paused')`,
    [req.params.id]
  );

  if (linked && parseInt(linked.cnt, 10) > 0) {
    sendError(res, 'METRIC_LINKED_TO_EXPERIMENT');
    return;
  }

  await query('DELETE FROM experiment_metrics WHERE metric_id = $1', [req.params.id]);
  await query('DELETE FROM metrics WHERE id = $1', [req.params.id]);

  res.status(200).json({ message: 'Metric deleted.' });
});

export default router;
