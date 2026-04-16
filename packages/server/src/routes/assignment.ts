import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticateClient } from '../middleware/auth';
import { assignVariant, assignVariantBulk } from '../services/assignment';

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
  experimentKeys: z.array(z.string().min(1)).min(1).max(50),
  context: z.record(z.any()).optional(),
});

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

// POST /api/assign/bulk — batch assignment for multiple experiments
router.post('/bulk', validate({ body: bulkAssignSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id.' });
    return;
  }

  const { userId, experimentKeys, context } = req.body;
  const assignments: Record<string, any> = {};

  // Run all assignments in parallel for speed
  await Promise.all(
    experimentKeys.map(async (key: string) => {
      assignments[key] = await assignVariant(projectId, key, userId, context);
    })
  );

  res.json({ assignments });
});

export default router;
