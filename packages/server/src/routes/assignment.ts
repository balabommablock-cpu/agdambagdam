import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticateClient } from '../middleware/auth';
import { assignVariant } from '../services/assignment';
import { query as dbQuery } from '../db/pool';
import { evaluateTargeting, TargetingCondition } from '../services/targeting';
import murmurhash from 'murmurhash-js';

const router = Router();
router.use(authenticateClient);

// --- Schemas ---

const assignSchema = z.object({
  userId: z.string().min(1),
  experimentKey: z.string().min(1),
  context: z.record(z.any()).optional(),
});

const bulkAssignSchema = z.object({
  userId: z.string().min(1),
  context: z.record(z.any()).optional(),
});

// --- Helper ---

function hashToPercentage(flagKey: string, userId: string): number {
  const hash = murmurhash.murmur3(`${flagKey}:${userId}`, 0);
  return ((hash >>> 0) / 0x100000000) * 100;
}

// --- Routes ---

// POST /api/assign — single experiment assignment
router.post('/', validate({ body: assignSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id.' });
    return;
  }

  const { userId, experimentKey, context } = req.body;
  const result = await assignVariant(projectId, experimentKey, userId, context);
  res.json(result);
});

// POST /api/assign/bulk — all running experiments + feature flags for a user
router.post('/bulk', validate({ body: bulkAssignSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id.' });
    return;
  }

  const { userId, context } = req.body;

  // 1. Get all running experiments and assign variants in parallel
  const experimentRows = await dbQuery<{ key: string }>(
    `SELECT key FROM experiments WHERE project_id = $1 AND status = 'running'`,
    [projectId]
  );

  const experiments: Record<string, any> = {};
  await Promise.all(
    experimentRows.map(async (row) => {
      experiments[row.key] = await assignVariant(projectId, row.key, userId, context);
    })
  );

  // 2. Evaluate all feature flags for this user
  const allFlags = await dbQuery<{
    key: string; enabled: boolean; default_value: any;
    targeting_rules: TargetingCondition[]; rollout_percentage: number;
  }>(
    'SELECT key, enabled, default_value, targeting_rules, rollout_percentage FROM feature_flags WHERE project_id = $1',
    [projectId]
  );

  const features: Record<string, { enabled: boolean; value: any }> = {};
  const userContext = context || {};

  for (const flag of allFlags) {
    if (!flag.enabled) {
      features[flag.key] = { enabled: false, value: flag.default_value };
      continue;
    }

    if (flag.targeting_rules && flag.targeting_rules.length > 0) {
      const targeted = evaluateTargeting(flag.targeting_rules, userContext);
      if (!targeted) {
        features[flag.key] = { enabled: false, value: flag.default_value };
        continue;
      }
    }

    if (flag.rollout_percentage < 100) {
      const userPct = hashToPercentage(flag.key, userId);
      if (userPct >= flag.rollout_percentage) {
        features[flag.key] = { enabled: false, value: flag.default_value };
        continue;
      }
    }

    features[flag.key] = {
      enabled: true,
      value: flag.default_value !== undefined ? flag.default_value : true,
    };
  }

  res.json({ experiments, features });
});

export default router;
