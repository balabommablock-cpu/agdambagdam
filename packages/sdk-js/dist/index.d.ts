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
export declare class Abacus {
    private config;
    private userId;
    private context;
    private storage;
    private queue;
    private experiments;
    private features;
    private initialized;
    private dntEnabled;
    private popstateHandler;
    private pushStatePatched;
    private originalPushState;
    private originalReplaceState;
    constructor(config: AbacusConfig);
    identify(userId: string, context?: Record<string, any>): void;
    setContext(context: Record<string, any>): void;
    getVariant(experimentKey: string): Promise<string>;
    getVariantWithPayload(experimentKey: string): Promise<{
        variant: string;
        payload: any;
    }>;
    getAllVariants(): Promise<Record<string, string>>;
    isFeatureEnabled(flagKey: string): Promise<boolean>;
    getFeatureValue(flagKey: string, defaultValue?: any): Promise<any>;
    getAllFeatureFlags(): Promise<Record<string, any>>;
    track(metricKey: string, value?: number, properties?: Record<string, any>): void;
    initialize(): Promise<void>;
    destroy(): void;
    private ensureInitialized;
    private fetchAssignments;
    private pushEvent;
    private trackPageView;
    private bindSPANavigation;
    private unbindSPANavigation;
}
export { murmurhash3, hashToFloat } from './hash';
export { Storage } from './storage';
export { EventQueue } from './queue';
export type { TrackEvent } from './queue';
export default Abacus;
