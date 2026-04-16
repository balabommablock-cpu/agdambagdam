import { murmurhash3, hashToFloat } from './hash';
import { Storage } from './storage';
import { EventQueue, TrackEvent } from './queue';

export interface AbacusConfig {
  apiKey: string;
  baseUrl: string;
  userId?: string;
  context?: Record<string, any>;
  autoTrack?: boolean;
  respectDNT?: boolean;
  stickyBucketing?: boolean;
  onAssignment?: (experiment: string, variant: string) => void;
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

const CACHE_KEY_EXPERIMENTS = 'experiments';
const CACHE_KEY_FEATURES = 'features';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class Abacus {
  private config: Required<
    Pick<AbacusConfig, 'apiKey' | 'baseUrl' | 'autoTrack' | 'respectDNT' | 'stickyBucketing'>
  > &
    AbacusConfig;
  private userId: string | undefined;
  private context: Record<string, any>;
  private storage: Storage;
  private queue: EventQueue;
  private experiments: Record<string, ExperimentAssignment> = {};
  private features: Record<string, FeatureFlag> = {};
  private initialized: boolean = false;
  private dntEnabled: boolean = false;
  private popstateHandler: (() => void) | null = null;
  private pushStatePatched: boolean = false;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  constructor(config: AbacusConfig) {
    this.config = {
      autoTrack: true,
      respectDNT: true,
      stickyBucketing: true,
      ...config,
    };

    this.userId = config.userId;
    this.context = config.context || {};
    this.storage = new Storage();
    this.queue = new EventQueue(
      `${this.config.baseUrl}/api/v1/events`,
      this.config.apiKey
    );

    // Check Do Not Track
    if (this.config.respectDNT && typeof navigator !== 'undefined') {
      this.dntEnabled =
        navigator.doNotTrack === '1' ||
        (navigator as any).globalPrivacyControl === true;
    }

    // Load sticky assignments from storage
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

  // --- Identity ---

  identify(userId: string, context?: Record<string, any>): void {
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

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  // --- Experiments ---

  async getVariant(experimentKey: string): Promise<string> {
    await this.ensureInitialized();
    const assignment = this.experiments[experimentKey];
    if (!assignment) return 'control';

    if (this.config.onAssignment) {
      this.config.onAssignment(experimentKey, assignment.variant);
    }

    return assignment.variant;
  }

  async getVariantWithPayload(
    experimentKey: string
  ): Promise<{ variant: string; payload: any }> {
    await this.ensureInitialized();
    const assignment = this.experiments[experimentKey];
    if (!assignment) return { variant: 'control', payload: null };

    if (this.config.onAssignment) {
      this.config.onAssignment(experimentKey, assignment.variant);
    }

    return { variant: assignment.variant, payload: assignment.payload ?? null };
  }

  async getAllVariants(): Promise<Record<string, string>> {
    await this.ensureInitialized();
    const result: Record<string, string> = {};
    for (const [key, assignment] of Object.entries(this.experiments)) {
      result[key] = assignment.variant;
    }
    return result;
  }

  // --- Feature Flags ---

  async isFeatureEnabled(flagKey: string): Promise<boolean> {
    await this.ensureInitialized();
    const flag = this.features[flagKey];
    return flag ? flag.enabled : false;
  }

  async getFeatureValue(flagKey: string, defaultValue: any = null): Promise<any> {
    await this.ensureInitialized();
    const flag = this.features[flagKey];
    if (!flag || !flag.enabled) return defaultValue;
    return flag.value ?? defaultValue;
  }

  async getAllFeatureFlags(): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const result: Record<string, any> = {};
    for (const [key, flag] of Object.entries(this.features)) {
      result[key] = flag.enabled ? (flag.value ?? true) : false;
    }
    return result;
  }

  // --- Event Tracking ---

  track(metricKey: string, value?: number, properties?: Record<string, any>): void {
    if (this.dntEnabled) return;

    this.pushEvent({
      type: 'track',
      key: metricKey,
      userId: this.userId,
      value,
      properties,
      timestamp: Date.now(),
    });
  }

  // --- Lifecycle ---

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.fetchAssignments();
    this.initialized = true;

    if (this.config.autoTrack && typeof window !== 'undefined') {
      this.trackPageView();
      this.bindSPANavigation();
    }
  }

  destroy(): void {
    this.queue.destroy();
    this.unbindSPANavigation();
    this.initialized = false;
  }

  // --- Internal ---

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async fetchAssignments(): Promise<void> {
    try {
      const params: Record<string, any> = {
        userId: this.userId,
        context: this.context,
      };

      const res = await fetch(`${this.config.baseUrl}/api/v1/assignments`, {
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

      const data: BulkResponse = await res.json();

      this.experiments = data.experiments || {};
      this.features = data.features || {};

      // Persist for sticky bucketing
      if (this.config.stickyBucketing) {
        this.storage.set(CACHE_KEY_EXPERIMENTS, this.experiments, CACHE_TTL);
        this.storage.set(CACHE_KEY_FEATURES, this.features, CACHE_TTL);
      }
    } catch {
      // On network failure, keep using cached/sticky assignments
      // They were already loaded in the constructor
    }
  }

  private pushEvent(event: TrackEvent): void {
    if (this.dntEnabled) return;
    this.queue.push(event);
  }

  private trackPageView(): void {
    if (this.dntEnabled) return;
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

  private bindSPANavigation(): void {
    if (typeof window === 'undefined') return;

    // Listen for popstate (back/forward)
    this.popstateHandler = () => this.trackPageView();
    window.addEventListener('popstate', this.popstateHandler);

    // Patch pushState and replaceState
    if (!this.pushStatePatched && typeof history !== 'undefined') {
      this.originalPushState = history.pushState.bind(history);
      this.originalReplaceState = history.replaceState.bind(history);

      const self = this;

      history.pushState = function (...args: Parameters<typeof history.pushState>) {
        self.originalPushState!(...args);
        self.trackPageView();
      };

      history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
        self.originalReplaceState!(...args);
        self.trackPageView();
      };

      this.pushStatePatched = true;
    }
  }

  private unbindSPANavigation(): void {
    if (typeof window === 'undefined') return;

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

// Re-export utilities
export { murmurhash3, hashToFloat } from './hash';
export { Storage } from './storage';
export { EventQueue } from './queue';
export type { TrackEvent } from './queue';

export default Abacus;
