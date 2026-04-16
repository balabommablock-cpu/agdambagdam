import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// --- Schemas ---

const createProjectSchema = z.object({
  name: z.string().min(1).max(256),
});

// --- Routes ---

// GET /api/projects — list projects for org
router.get('/', async (req: Request, res: Response) => {
  if (!req.org) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const projects = await query(
    'SELECT * FROM projects WHERE org_id = $1 ORDER BY created_at DESC',
    [req.org.id]
  );
  res.json({ projects });
});

// POST /api/projects — create project
router.post('/', validate({ body: createProjectSchema }), async (req: Request, res: Response) => {
  if (!req.org) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const { name } = req.body;

  const project = await queryOne(
    `INSERT INTO projects (org_id, name) VALUES ($1, $2) RETURNING *`,
    [req.org.id, name]
  );

  res.status(201).json({ project });
});

export default router;
