// --- MurmurHash3 (identical to browser SDK) ---

function murmurhash3(key: string, seed: number = 0): number {
  const remainder = key.length & 3;
  const bytes = key.length - remainder;
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);
    i += 4;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }

  let k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

function hashToFloat(key: string, seed: number = 0): number {
  return (murmurhash3(key, seed) >>> 0) / 0x100000000;
}

// --- Types ---

export interface AbacusNodeConfig {
  apiKey: string;
  baseUrl: string;
  maxQueueSize?: number;
  flushInterval?: number;
  cacheAdapter?: CacheAdapter;
}

export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
}

interface TrackEvent {
  type: 'track' | 'identify';
  key?: string;
  userId: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
}

interface ExperimentAssignment {
  variant: string;
  payload?: any;
}

interface FeatureFlag {
  enabled: boolean;
  value: any;
}

interface BulkResponse {
  experiments: Record<string, ExperimentAssignment>;
  features: Record<string, FeatureFlag>;
}

// --- In-Memory Cache ---

interface CacheEntry {
  value: string;
  expiry?: number;
}

class MemoryCache implements CacheAdapter {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiry: ttlMs ? Date.now() + ttlMs : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// --- Event Queue (thread-safe via serial flush) ---

class NodeEventQueue {
  private queue: TrackEvent[] = [];
  private flushUrl: string;
  private apiKey: string;
  private maxSize: number;
  private flushInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private destroyed = false;
  private retryCount = 0;

  constructor(
    flushUrl: string,
    apiKey: string,
    maxSize = 50,
    flushInterval = 5000
  ) {
    this.flushUrl = flushUrl;
    this.apiKey = apiKey;
    this.maxSize = maxSize;
    this.flushInterval = flushInterval;
    this.timer = setInterval(() => this.flush(), this.flushInterval);
    // Allow Node process to exit even if timer is running
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  push(event: TrackEvent): void {
    if (this.destroyed) return;
    this.queue.push(event);
    if (this.queue.length >= this.maxSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0 || this.destroyed) return;
    this.flushing = true;

    const batch = this.queue.splice(0, this.maxSize);

    try {
      const res = await fetch(this.flushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ events: batch }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.retryCount = 0;
    } catch {
      this.queue.unshift(...batch);
      if (this.retryCount < 3) {
        this.retryCount++;
        const delay = 1000 * Math.pow(2, this.retryCount - 1);
        setTimeout(() => {
          this.flushing = false;
          this.flush();
        }, delay);
        return;
      }
      // Drop batch after max retries
      this.queue.splice(0, batch.length);
      this.retryCount = 0;
    }

    this.flushing = false;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// --- Main SDK ---

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class AbacusNode {
  private config: Required<Pick<AbacusNodeConfig, 'apiKey' | 'baseUrl'>> & AbacusNodeConfig;
  private cache: CacheAdapter;
  private queue: NodeEventQueue;

  constructor(config: AbacusNodeConfig) {
    this.config = config;
    this.cache = config.cacheAdapter || new MemoryCache();
    this.queue = new NodeEventQueue(
      `${config.baseUrl}/api/v1/events`,
      config.apiKey,
      config.maxQueueSize,
      config.flushInterval
    );
  }

  async getVariant(
    experimentKey: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<string> {
    const assignments = await this.getAssignments(userId, context);
    const assignment = assignments.experiments[experimentKey];
    return assignment ? assignment.variant : 'control';
  }

  async isFeatureEnabled(
    flagKey: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const assignments = await this.getAssignments(userId, context);
    const flag = assignments.features[flagKey];
    return flag ? flag.enabled : false;
  }

  async getFeatureValue(
    flagKey: string,
    userId: string,
    defaultValue: any = null,
    context?: Record<string, any>
  ): Promise<any> {
    const assignments = await this.getAssignments(userId, context);
    const flag = assignments.features[flagKey];
    if (!flag || !flag.enabled) return defaultValue;
    return flag.value ?? defaultValue;
  }

  track(
    userId: string,
    metricKey: string,
    value?: number,
    properties?: Record<string, any>
  ): void {
    this.queue.push({
      type: 'track',
      key: metricKey,
      userId,
      value,
      properties,
      timestamp: Date.now(),
    });
  }

  async flush(): Promise<void> {
    await this.queue.flush();
  }

  destroy(): void {
    this.queue.destroy();
  }

  // --- Internal ---

  private async getAssignments(
    userId: string,
    context?: Record<string, any>
  ): Promise<BulkResponse> {
    const cacheKey = `assignments:${userId}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // corrupted cache, refetch
      }
    }

    // Fetch from server
    try {
      const res = await fetch(`${this.config.baseUrl}/api/v1/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({ userId, context: context || {} }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as BulkResponse;

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(data), CACHE_TTL);

      return data;
    } catch {
      // Return empty on failure
      return { experiments: {}, features: {} };
    }
  }
}

export { murmurhash3, hashToFloat };
export default AbacusNode;
