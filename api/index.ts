import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Import route handlers
import experimentsRouter from '../packages/server/src/routes/experiments';
import assignmentRouter from '../packages/server/src/routes/assignment';
import eventsRouter from '../packages/server/src/routes/events';
import flagsRouter from '../packages/server/src/routes/flags';
import metricsRouter from '../packages/server/src/routes/metrics';
import projectsRouter from '../packages/server/src/routes/projects';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'abacus-server', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/experiments', experimentsRouter);
app.use('/api/assign', assignmentRouter);
app.use('/api/events', eventsRouter);
app.use('/api/flags', flagsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/projects', projectsRouter);

// 404
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  const pgError = err as any;
  if (pgError.code === '23505') {
    res.status(409).json({ error: 'Duplicate entry.' });
    return;
  }
  if (pgError.code === '23503') {
    res.status(400).json({ error: 'Referenced record not found.' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as any)(req, res);
}
