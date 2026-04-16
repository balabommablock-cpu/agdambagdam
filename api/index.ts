/**
 * Vercel serverless entry. Delegates to the shared createApp() factory in
 * packages/server so security middleware, rate limits, and error handling
 * are identical to the Node entry at packages/server/src/index.ts.
 *
 * Rate limiting on serverless:
 *   The default MemoryStore is per-function-instance, so per-IP limits
 *   are multiplied by the number of warm instances. To enforce a single
 *   global limit, set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   in Vercel env vars; we'll auto-wire RedisStore below.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Store } from 'express-rate-limit';
import { createApp } from '../packages/server/src/createApp';

// Lazily construct a shared rate-limit store if Upstash is configured.
function resolveRateLimitStore(): Store | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require('@upstash/redis');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RedisStore } = require('rate-limit-redis');
    const client = new Redis({ url, token });
    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
      prefix: 'abacus:rl:',
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      '[abacus] UPSTASH_REDIS_* env vars set but @upstash/redis / rate-limit-redis not installed. ' +
        'Falling back to per-instance memory store.'
    );
    return undefined;
  }
}

const app = createApp({
  rateLimitStore: resolveRateLimitStore(),
  trustProxy: 1,
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as (req: unknown, res: unknown) => unknown)(req, res);
}
