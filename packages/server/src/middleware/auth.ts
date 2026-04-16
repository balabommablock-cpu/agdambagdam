import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../db/pool';

export interface Organization {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      org?: Organization;
      projectId?: string;
      isClientKey?: boolean;
    }
  }
}

// Cache org lookups for performance (TTL: 60s)
const orgCache = new Map<string, { org: Organization; expires: number }>();
const CACHE_TTL = 60_000;

function getCachedOrg(apiKey: string): Organization | null {
  const cached = orgCache.get(apiKey);
  if (cached && cached.expires > Date.now()) {
    return cached.org;
  }
  if (cached) {
    orgCache.delete(apiKey);
  }
  return null;
}

function setCachedOrg(apiKey: string, org: Organization): void {
  orgCache.set(apiKey, { org, expires: Date.now() + CACHE_TTL });
}

/**
 * Full API key auth — required for admin endpoints.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string | undefined
    || req.query.api_key as string | undefined;

  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key. Provide x-api-key header or api_key query param.' });
    return;
  }

  let org = getCachedOrg(apiKey);
  if (!org) {
    org = await queryOne<Organization>(
      'SELECT id, name, api_key, created_at FROM organizations WHERE api_key = $1',
      [apiKey]
    );
    if (!org) {
      res.status(401).json({ error: 'Invalid API key.' });
      return;
    }
    setCachedOrg(apiKey, org);
  }

  req.org = org;

  // Extract project_id from header or query
  const projectId = req.headers['x-project-id'] as string | undefined
    || req.query.project_id as string | undefined;
  if (projectId) {
    req.projectId = projectId;
  }

  next();
}

/**
 * Client key auth — for SDK endpoints (assignment, events, flag evaluation).
 * Same lookup but marks the request as client-only (no admin mutations).
 */
export async function authenticateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  req.isClientKey = true;
  await authenticate(req, res, next);
}
