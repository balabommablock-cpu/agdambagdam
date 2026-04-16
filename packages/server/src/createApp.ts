/**
 * Shared Express app factory.
 *
 * Both `packages/server/src/index.ts` (long-running Node process) and
 * `api/index.ts` (Vercel serverless) use this so security middleware,
 * error handling, CORS, and rate limiting behave identically in both
 * deployment modes.
 *
 * Rate limiting note:
 *   express-rate-limit's default MemoryStore is per-process. On Vercel
 *   serverless, each warm instance holds its own counter, so the limit
 *   is effectively N_instances * limit. Provide a shared store
 *   (Upstash Redis, Vercel KV) via `options.rateLimitStore` for
 *   accurate enforcement across the fleet.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit, { Store } from 'express-rate-limit';

import experimentsRouter from './routes/experiments';
import assignmentRouter from './routes/assignment';
import eventsRouter from './routes/events';
import flagsRouter from './routes/flags';
import metricsRouter from './routes/metrics';
import projectsRouter from './routes/projects';

export interface CreateAppOptions {
  /** Shared rate-limit store (e.g. RedisStore). If omitted, uses MemoryStore (per-process). */
  rateLimitStore?: Store;
  /** Max request body size. Defaults to '1mb'. */
  jsonLimit?: string;
  /** CORS options. Defaults to reflect request origin with credentials disabled. */
  cors?: CorsOptions;
  /** Trust proxy hops (needed on Vercel so req.ip is the real client). Defaults to 1. */
  trustProxy?: number | boolean | string;
  /** Disable rate limiting entirely (e.g. for tests). */
  disableRateLimit?: boolean;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const {
    rateLimitStore,
    jsonLimit = '1mb',
    cors: corsOptions = { origin: true, credentials: false },
    trustProxy = 1,
    disableRateLimit = false,
  } = options;

  const app = express();

  // Honor X-Forwarded-For so req.ip is the real client (required for rate-limit).
  app.set('trust proxy', trustProxy);

  // Strip Express fingerprint.
  app.disable('x-powered-by');

  // --- Security & transport middleware ---
  app.use(
    helmet({
      // CSP is better set at the edge (Vercel headers) for SPA apps because
      // the SPA needs 'unsafe-inline' for Vite's inlined styles anyway.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(cors(corsOptions));

  // JSON body parser with size limit + custom parse-error handler.
  app.use(express.json({ limit: jsonLimit }));

  // --- Rate limiters ---
  const makeLimiter = (max: number, msg: string) =>
    rateLimit({
      windowMs: 60_000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      store: rateLimitStore,
      message: { error: msg },
    });

  const generalLimiter = makeLimiter(100, 'Too many requests, please try again later.');
  const assignmentLimiter = makeLimiter(200, 'Too many assignment requests, please try again later.');
  const eventsLimiter = makeLimiter(500, 'Too many event requests, please try again later.');
  // Specifically protect the auth gate from API-key enumeration (25/min/IP for unauth requests).
  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    store: rateLimitStore,
    skipSuccessfulRequests: true,
    message: { error: 'Too many auth attempts, please try again later.' },
  });

  if (!disableRateLimit) {
    app.use('/api', generalLimiter);
    app.use('/api', authLimiter);
  }

  // --- Health ---
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'abacus-server',
      timestamp: new Date().toISOString(),
      rateLimitStore: rateLimitStore ? 'shared' : 'memory-per-instance',
    });
  });

  // --- Routes ---
  app.use('/api/experiments', experimentsRouter);
  if (!disableRateLimit) app.use('/api/assign', assignmentLimiter);
  app.use('/api/assign', assignmentRouter);
  if (!disableRateLimit) app.use('/api/events', eventsLimiter);
  app.use('/api/events', eventsRouter);
  app.use('/api/flags', flagsRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/projects', projectsRouter);

  // --- API 404 (only for /api/* — non-API falls through to SPA) ---
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // --- Unified error handler ---
  // Must be declared LAST. Handles:
  //   - body-parser JSON syntax errors  → 400
  //   - body-parser payload-too-large   → 413
  //   - Postgres unique-violation (23505)→ 409
  //   - Postgres fk-violation (23503)   → 400
  //   - Everything else                 → 500 (no stack in prod)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // body-parser emits SyntaxError with status 400 for bad JSON and
    // `type === 'entity.too.large'` for oversized payloads.
    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      res.status(400).json({ error: 'Invalid JSON body.' });
      return;
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: `Request body exceeds ${jsonLimit}.` });
      return;
    }
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Duplicate entry. A record with this key already exists.' });
      return;
    }
    if (err?.code === '23503') {
      res.status(400).json({ error: 'Referenced record not found.' });
      return;
    }

    // Log in all environments; never echo the message to the client in prod.
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? String(err?.message ?? err) : undefined,
    });
  });

  return app;
}
