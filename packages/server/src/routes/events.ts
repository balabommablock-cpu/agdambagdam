import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticateClient } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();
router.use(authenticateClient);

// --- Schemas ---

const trackEventSchema = z.object({
  userId: z.string().min(1),
  metricKey: z.string().min(1),
  value: z.number().default(1.0),
  properties: z.record(z.any()).default({}),
  timestamp: z.string().datetime().optional(),
});

const batchEventsSchema = z.object({
  events: z.array(z.object({
    userId: z.string().min(1),
    metricKey: z.string().min(1),
    value: z.number().default(1.0),
    properties: z.record(z.any()).default({}),
    timestamp: z.string().datetime().optional(),
  })).min(1).max(1000),
});

// --- Routes ---

// POST /api/events — track single event
router.post('/', validate({ body: trackEventSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id.' });
    return;
  }

  const { userId, metricKey, value, properties, timestamp } = req.body;

  await query(
    `INSERT INTO events (project_id, user_id, metric_key, value, properties, timestamp)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))`,
    [projectId, userId, metricKey, value, JSON.stringify(properties), timestamp || null]
  );

  res.status(202).json({ success: true });
});

// POST /api/events/batch — track multiple events
router.post('/batch', validate({ body: batchEventsSchema }), async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project_id.' });
    return;
  }

  const { events } = req.body;

  // Build a single multi-row INSERT for efficiency
  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const event of events) {
    placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, COALESCE($${idx + 5}::timestamptz, now()))`);
    values.push(
      projectId,
      event.userId,
      event.metricKey,
      event.value,
      JSON.stringify(event.properties || {}),
      event.timestamp || null
    );
    idx += 6;
  }

  await query(
    `INSERT INTO events (project_id, user_id, metric_key, value, properties, timestamp)
     VALUES ${placeholders.join(', ')}`,
    values
  );

  res.status(202).json({ success: true, count: events.length });
});

export default router;
