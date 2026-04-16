import { Storage } from './storage';
import { EventQueue } from './queue';
const CACHE_KEY_EXPERIMENTS = 'experiments';
const CACHE_KEY_FEATURES = 'features';
const CACHE_TTL = 5 * 60 * 1000;
export class Abacus {
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
export { murmurhash3, hashToFloat } from './hash';
export { Storage } from './storage';
export { EventQueue } from './queue';
export default Abacus;
