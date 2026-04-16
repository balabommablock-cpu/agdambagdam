import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import experimentsRouter from './routes/experiments';
import assignmentRouter from './routes/assignment';
import eventsRouter from './routes/events';
import flagsRouter from './routes/flags';
import metricsRouter from './routes/metrics';
import projectsRouter from './routes/projects';

const app = express();

// --- Middleware ---
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// --- Rate Limiting ---

// General API: 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Assignment endpoint: 200 requests per minute per IP (SDKs call this frequently)
const assignmentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many assignment requests, please try again later.' },
});

// Events endpoint: 500 requests per minute per IP (batch events)
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many event requests, please try again later.' },
});

// Apply general limiter to all API routes
app.use('/api', generalLimiter);

// --- Health check ---
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'agdam-bagdam', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/experiments', experimentsRouter);
app.use('/api/assign', assignmentLimiter, assignmentRouter);
app.use('/api/events', eventsLimiter, eventsRouter);
app.use('/api/flags', flagsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/projects', projectsRouter);

// --- 404 handler ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Error handling ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Check for known DB errors
  const pgError = err as any;
  if (pgError.code === '23505') {
    res.status(409).json({ error: 'Duplicate entry. A record with this key already exists.' });
    return;
  }
  if (pgError.code === '23503') {
    res.status(400).json({ error: 'Referenced record not found.' });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// --- Start server ---
const PORT = parseInt(process.env.PORT || '3456', 10);

app.listen(PORT, () => {
  console.log(`Abacus server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
