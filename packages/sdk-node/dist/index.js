"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbacusNode = void 0;
exports.murmurhash3 = murmurhash3;
exports.hashToFloat = hashToFloat;
function murmurhash3(key, seed = 0) {
    const remainder = key.length & 3;
    const bytes = key.length - remainder;
    let h1 = seed >>> 0;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    let i = 0;
    while (i < bytes) {
        let k1 = (key.charCodeAt(i) & 0xff) |
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
function hashToFloat(key, seed = 0) {
    return (murmurhash3(key, seed) >>> 0) / 0x100000000;
}
class MemoryCache {
    store = new Map();
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiry && Date.now() > entry.expiry) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiry: ttlMs ? Date.now() + ttlMs : undefined,
        });
    }
    async del(key) {
        this.store.delete(key);
    }
}
class NodeEventQueue {
    queue = [];
    flushUrl;
    apiKey;
    maxSize;
    flushInterval;
    timer = null;
    flushing = false;
    destroyed = false;
    retryCount = 0;
    constructor(flushUrl, apiKey, maxSize = 50, flushInterval = 5000) {
        this.flushUrl = flushUrl;
        this.apiKey = apiKey;
        this.maxSize = maxSize;
        this.flushInterval = flushInterval;
        this.timer = setInterval(() => this.flush(), this.flushInterval);
        if (this.timer && typeof this.timer.unref === 'function') {
            this.timer.unref();
        }
    }
    push(event) {
        if (this.destroyed)
            return;
        this.queue.push(event);
        if (this.queue.length >= this.maxSize) {
            this.flush();
        }
    }
    async flush() {
        if (this.flushing || this.queue.length === 0 || this.destroyed)
            return;
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
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            this.retryCount = 0;
        }
        catch {
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
            this.queue.splice(0, batch.length);
            this.retryCount = 0;
        }
        this.flushing = false;
    }
    destroy() {
        this.destroyed = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
const CACHE_TTL = 5 * 60 * 1000;
class AbacusNode {
    config;
    cache;
    queue;
    constructor(config) {
        this.config = config;
        this.cache = config.cacheAdapter || new MemoryCache();
        this.queue = new NodeEventQueue(`${config.baseUrl}/api/events/batch`, config.apiKey, config.maxQueueSize, config.flushInterval);
    }
    async getVariant(experimentKey, userId, context) {
        const assignments = await this.getAssignments(userId, context);
        const assignment = assignments.experiments[experimentKey];
        return assignment ? assignment.variant : 'control';
    }
    async isFeatureEnabled(flagKey, userId, context) {
        const assignments = await this.getAssignments(userId, context);
        const flag = assignments.features[flagKey];
        return flag ? flag.enabled : false;
    }
    async getFeatureValue(flagKey, userId, defaultValue = null, context) {
        const assignments = await this.getAssignments(userId, context);
        const flag = assignments.features[flagKey];
        if (!flag || !flag.enabled)
            return defaultValue;
        return flag.value ?? defaultValue;
    }
    track(userId, metricKey, value, properties) {
        this.queue.push({
            type: 'track',
            key: metricKey,
            userId,
            value,
            properties,
            timestamp: Date.now(),
        });
    }
    async flush() {
        await this.queue.flush();
    }
    destroy() {
        this.queue.destroy();
    }
    async getAssignments(userId, context) {
        const cacheKey = `assignments:${userId}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            }
            catch {
            }
        }
        try {
            const res = await fetch(`${this.config.baseUrl}/api/assign/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.config.apiKey,
                },
                body: JSON.stringify({ userId, context: context || {} }),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = (await res.json());
            await this.cache.set(cacheKey, JSON.stringify(data), CACHE_TTL);
            return data;
        }
        catch {
            return { experiments: {}, features: {} };
        }
    }
}
exports.AbacusNode = AbacusNode;
exports.default = AbacusNode;
