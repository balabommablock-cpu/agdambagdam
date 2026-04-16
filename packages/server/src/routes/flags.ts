import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { validate } from '../middleware/validate';
import { authenticate, authenticateClient } from '../middleware/auth';
import { evaluateTargeting, TargetingCondition } from '../services/targeting';
import { sendError } from '../lib/errors';
import murmurhash from 'murmurhash-js';

const router = Router();

// --- Schemas ---

const createFlagSchema = z.object({
  key: z.string().min(1).max(128).regex(/^[a-z0-9_-]+$/, 'Key must be lowercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  enabled: z.boolean().default(false),
  default_value: z.any().default(false),
  targeting_rules: z.array(z.any()).default([]),
  rollout_percentage: z.number().min(0).max(100).default(0),
});

const updateFlagSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  default_value: z.any().optional(),
  targeting_rules: z.array(z.any()).optional(),
  rollout_percentage: z.number().min(0).max(100).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const evaluateFlagsSchema = z.object({
  userId: z.string().min(1),
  context: z.record(z.any()).default({}),
});

// --- Helper ---

function hashToPercentage(flagKey: string, userId: string): number {
  const hash = murmurhash.murmur3(`${flagKey}:${userId}`, 0);
  return ((hash >>> 0) / 0x100000000) * 100;
}

// --- Admin routes (full auth) ---

// GET /api/flags — list flags
router.get('/', authenticate, async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const flags = await query(
    'SELECT * FROM feature_flags WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );
  res.json({ flags });
});

// POST /api/flags — create flag
router.post('/', authenticate, validate({ body: createFlagSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const body = req.body;
  const flag = await queryOne(
    `INSERT INTO feature_flags (project_id, key, name, description, enabled, default_value, targeting_rules, rollout_percentage)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [projectId, body.key, body.name, body.description || null,
     body.enabled, JSON.stringify(body.default_value),
     JSON.stringify(body.targeting_rules), body.rollout_percentage]
  );

  res.status(201).json({ flag });
});

// PUT /api/flags/:id — update flag
router.put('/:id', authenticate, validate({ params: idParamSchema, body: updateFlagSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const existing = await queryOne('SELECT id FROM feature_flags WHERE id = $1 AND project_id = $2', [req.params.id, projectId]);
  if (!existing) {
    sendError(res, 'FEATURE_FLAG_NOT_FOUND');
    return;
  }

  const body = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const field of ['name', 'description', 'enabled', 'rollout_percentage'] as const) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx}`);
      params.push(body[field]);
      idx++;
    }
  }

  if (body.default_value !== undefined) {
    updates.push(`default_value = $${idx}`);
    params.push(JSON.stringify(body.default_value));
    idx++;
  }

  if (body.targeting_rules !== undefined) {
    updates.push(`targeting_rules = $${idx}`);
    params.push(JSON.stringify(body.targeting_rules));
    idx++;
  }

  if (updates.length === 0) {
    const flag = await queryOne('SELECT * FROM feature_flags WHERE id = $1', [req.params.id]);
    res.json({ flag });
    return;
  }

  updates.push('updated_at = now()');
  params.push(req.params.id);

  const flag = await queryOne(
    `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );

  res.json({ flag });
});

// POST /api/flags/:id/toggle — enable/disable
router.post('/:id/toggle', authenticate, validate({ params: idParamSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const flag = await queryOne<{ enabled: boolean }>(
    'SELECT enabled FROM feature_flags WHERE id = $1 AND project_id = $2',
    [req.params.id, projectId]
  );

  if (!flag) {
    sendError(res, 'FEATURE_FLAG_NOT_FOUND');
    return;
  }

  const updated = await queryOne(
    `UPDATE feature_flags SET enabled = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [!flag.enabled, req.params.id]
  );

  res.json({ flag: updated });
});

// POST /api/flags/evaluate — evaluate flags for a user (SDK endpoint)
router.post('/evaluate', authenticateClient, validate({ body: evaluateFlagsSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  const { userId, context } = req.body;

  const allFlags = await query<{
    key: string; enabled: boolean; default_value: any;
    targeting_rules: TargetingCondition[]; rollout_percentage: number;
  }>(
    'SELECT key, enabled, default_value, targeting_rules, rollout_percentage FROM feature_flags WHERE project_id = $1',
    [projectId]
  );

  const flags: Record<string, any> = {};

  for (const flag of allFlags) {
    // Flag disabled = default value
    if (!flag.enabled) {
      flags[flag.key] = flag.default_value;
      continue;
    }

    // Check targeting rules
    if (flag.targeting_rules && flag.targeting_rules.length > 0) {
      const targeted = evaluateTargeting(flag.targeting_rules, context);
      if (!targeted) {
        flags[flag.key] = flag.default_value;
        continue;
      }
    }

    // Check rollout percentage
    if (flag.rollout_percentage < 100) {
      const userPercentage = hashToPercentage(flag.key, userId);
      if (userPercentage >= flag.rollout_percentage) {
        flags[flag.key] = flag.default_value;
        continue;
      }
    }

    // User qualifies — return the configured value (supports boolean, string, number, JSON)
    flags[flag.key] = flag.default_value !== undefined ? flag.default_value : true;
  }

  res.json({ flags });
});

export default router;
