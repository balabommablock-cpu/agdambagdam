(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Abacus = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function() {
  'use strict';

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
    const hash = murmurhash3(key, seed);
    return (hash >>> 0) / 0x100000000;
}


  const STORAGE_PREFIX = 'abacus_';
class Storage {
    constructor() {
        this.memoryStore = new Map();
        this.useLocalStorage = this.checkLocalStorage();
    }
    checkLocalStorage() {
        try {
            const testKey = STORAGE_PREFIX + '__test__';
            localStorage.setItem(testKey, '1');
            localStorage.removeItem(testKey);
            return true;
        }
        catch {
            return false;
        }
    }
    get(key) {
        const fullKey = STORAGE_PREFIX + key;
        if (this.useLocalStorage) {
            try {
                const raw = localStorage.getItem(fullKey);
                if (raw === null)
                    return undefined;
                const entry = JSON.parse(raw);
                if (entry.e && Date.now() > entry.e) {
                    localStorage.removeItem(fullKey);
                    return undefined;
                }
                return entry.v;
            }
            catch {
                return undefined;
            }
        }
        const entry = this.memoryStore.get(fullKey);
        if (!entry)
            return undefined;
        if (entry.e && Date.now() > entry.e) {
            this.memoryStore.delete(fullKey);
            return undefined;
        }
        return entry.v;
    }
    set(key, value, ttl) {
        const fullKey = STORAGE_PREFIX + key;
        const entry = { v: value };
        if (ttl) {
            entry.e = Date.now() + ttl;
        }
        if (this.useLocalStorage) {
            try {
                localStorage.setItem(fullKey, JSON.stringify(entry));
                return;
            }
            catch {
            }
        }
        this.memoryStore.set(fullKey, entry);
    }
    remove(key) {
        const fullKey = STORAGE_PREFIX + key;
        if (this.useLocalStorage) {
            try {
                localStorage.removeItem(fullKey);
            }
            catch {
            }
        }
        this.memoryStore.delete(fullKey);
    }
    clear() {
        if (this.useLocalStorage) {
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(STORAGE_PREFIX)) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach((k) => localStorage.removeItem(k));
            }
            catch {
            }
        }
        this.memoryStore.clear();
    }
}


  const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;
class EventQueue {
    constructor(flushUrl, apiKey, maxSize = 10, flushInterval = 5000) {
        this.queue = [];
        this.timer = null;
        this.retryCount = 0;
        this.flushing = false;
        this.destroyed = false;
        this.boundBeaconFlush = null;
        this.flushUrl = flushUrl;
        this.apiKey = apiKey;
        this.maxSize = maxSize;
        this.flushInterval = flushInterval;
        this.startTimer();
        this.bindPageUnload();
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
                keepalive: true,
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            this.retryCount = 0;
        }
        catch {
            this.queue.unshift(...batch);
            if (this.retryCount < MAX_RETRIES) {
                this.retryCount++;
                const delay = BASE_RETRY_DELAY * Math.pow(2, this.retryCount - 1);
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
        this.unbindPageUnload();
        this.beaconFlush();
    }
    startTimer() {
        this.timer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }
    bindPageUnload() {
        if (typeof window === 'undefined')
            return;
        this.boundBeaconFlush = () => this.beaconFlush();
        window.addEventListener('visibilitychange', this.boundBeaconFlush);
        window.addEventListener('pagehide', this.boundBeaconFlush);
    }
    unbindPageUnload() {
        if (typeof window === 'undefined' || !this.boundBeaconFlush)
            return;
        window.removeEventListener('visibilitychange', this.boundBeaconFlush);
        window.removeEventListener('pagehide', this.boundBeaconFlush);
    }
    beaconFlush() {
        if (this.queue.length === 0)
            return;
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const payload = JSON.stringify({
                events: this.queue,
                apiKey: this.apiKey,
            });
            navigator.sendBeacon(this.flushUrl, new Blob([payload], { type: 'application/json' }));
            this.queue = [];
        }
    }
}


  

const CACHE_KEY_EXPERIMENTS = 'experiments';
const CACHE_KEY_FEATURES = 'features';
const CACHE_TTL = 5 * 60 * 1000;
class Abacus {
    constructor(config) {
        this.experiments = {};
        this.features = {};
        this.initialized = false;
        this.dntEnabled = false;
        this.popstateHandler = null;
        this.pushStatePatched = false;
        this.originalPushState = null;
        this.originalReplaceState = null;
        this.config = {
            autoTrack: true,
            respectDNT: true,
            stickyBucketing: true,
            ...config,
        };
        this.userId = config.userId;
        this.context = config.context || {};
        this.storage = new Storage();
        this.queue = new EventQueue(`${this.config.baseUrl}/api/events/batch`, this.config.apiKey);
        if (this.config.respectDNT && typeof navigator !== 'undefined') {
            this.dntEnabled =
                navigator.doNotTrack === '1' ||
                    navigator.globalPrivacyControl === true;
        }
        if (this.config.stickyBucketing) {
            const cached = this.storage.get(CACHE_KEY_EXPERIMENTS);
            if (cached) {
                this.experiments = cached;
            }
            const cachedFeatures = this.storage.get(CACHE_KEY_FEATURES);
            if (cachedFeatures) {
                this.features = cachedFeatures;
            }
        }
    }
    identify(userId, context) {
        this.userId = userId;
        if (context) {
            this.context = { ...this.context, ...context };
        }
        this.pushEvent({
            type: 'identify',
            userId: this.userId,
            properties: this.context,
            timestamp: Date.now(),
        });
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    async getVariant(experimentKey) {
        await this.ensureInitialized();
        const assignment = this.experiments[experimentKey];
        if (!assignment)
            return 'control';
        if (this.config.onAssignment) {
            this.config.onAssignment(experimentKey, assignment.variant);
        }
        return assignment.variant;
    }
    async getVariantWithPayload(experimentKey) {
        await this.ensureInitialized();
        const assignment = this.experiments[experimentKey];
        if (!assignment)
            return { variant: 'control', payload: null };
        if (this.config.onAssignment) {
            this.config.onAssignment(experimentKey, assignment.variant);
        }
        return { variant: assignment.variant, payload: assignment.payload ?? null };
    }
    async getAllVariants() {
        await this.ensureInitialized();
        const result = {};
        for (const [key, assignment] of Object.entries(this.experiments)) {
            result[key] = assignment.variant;
        }
        return result;
    }
    async isFeatureEnabled(flagKey) {
        await this.ensureInitialized();
        const flag = this.features[flagKey];
        return flag ? flag.enabled : false;
    }
    async getFeatureValue(flagKey, defaultValue = null) {
        await this.ensureInitialized();
        const flag = this.features[flagKey];
        if (!flag || !flag.enabled)
            return defaultValue;
        return flag.value ?? defaultValue;
    }
    async getAllFeatureFlags() {
        await this.ensureInitialized();
        const result = {};
        for (const [key, flag] of Object.entries(this.features)) {
            result[key] = flag.enabled ? (flag.value ?? true) : false;
        }
        return result;
    }
    track(metricKey, value, properties) {
        if (this.dntEnabled)
            return;
        this.pushEvent({
            type: 'track',
            key: metricKey,
            userId: this.userId,
            value,
            properties,
            timestamp: Date.now(),
        });
    }
    async initialize() {
        if (this.initialized)
            return;
        await this.fetchAssignments();
        this.initialized = true;
        if (this.config.autoTrack && typeof window !== 'undefined') {
            this.trackPageView();
            this.bindSPANavigation();
        }
    }
    destroy() {
        this.queue.destroy();
        this.unbindSPANavigation();
        this.initialized = false;
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    async fetchAssignments() {
        try {
            const params = {
                userId: this.userId,
                context: this.context,
            };
            const res = await fetch(`${this.config.baseUrl}/api/assign/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.config.apiKey,
                },
                body: JSON.stringify(params),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            this.experiments = data.experiments || {};
            this.features = data.features || {};
            if (this.config.stickyBucketing) {
                this.storage.set(CACHE_KEY_EXPERIMENTS, this.experiments, CACHE_TTL);
                this.storage.set(CACHE_KEY_FEATURES, this.features, CACHE_TTL);
            }
        }
        catch {
        }
    }
    pushEvent(event) {
        if (this.dntEnabled)
            return;
        this.queue.push(event);
    }
    trackPageView() {
        if (this.dntEnabled)
            return;
        this.pushEvent({
            type: 'page',
            userId: this.userId,
            properties: {
                url: location.href,
                path: location.pathname,
                referrer: document.referrer || undefined,
                title: document.title,
            },
            timestamp: Date.now(),
        });
    }
    bindSPANavigation() {
        if (typeof window === 'undefined')
            return;
        this.popstateHandler = () => this.trackPageView();
        window.addEventListener('popstate', this.popstateHandler);
        if (!this.pushStatePatched && typeof history !== 'undefined') {
            this.originalPushState = history.pushState.bind(history);
            this.originalReplaceState = history.replaceState.bind(history);
            const self = this;
            history.pushState = function (...args) {
                self.originalPushState(...args);
                self.trackPageView();
            };
            history.replaceState = function (...args) {
                self.originalReplaceState(...args);
                self.trackPageView();
            };
            this.pushStatePatched = true;
        }
    }
    unbindSPANavigation() {
        if (typeof window === 'undefined')
            return;
        if (this.popstateHandler) {
            window.removeEventListener('popstate', this.popstateHandler);
            this.popstateHandler = null;
        }
        if (this.pushStatePatched && this.originalPushState && this.originalReplaceState) {
            history.pushState = this.originalPushState;
            history.replaceState = this.originalReplaceState;
            this.pushStatePatched = false;
        }
    }
}
{ murmurhash3, hashToFloat } from './hash';
{ Storage } from './storage';
{ EventQueue } from './queue';
Abacus;


  return Abacus;
}));
