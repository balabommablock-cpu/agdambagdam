declare function murmurhash3(key: string, seed?: number): number;
declare function hashToFloat(key: string, seed?: number): number;
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
export declare class AbacusNode {
    private config;
    private cache;
    private queue;
    constructor(config: AbacusNodeConfig);
    getVariant(experimentKey: string, userId: string, context?: Record<string, any>): Promise<string>;
    isFeatureEnabled(flagKey: string, userId: string, context?: Record<string, any>): Promise<boolean>;
    getFeatureValue(flagKey: string, userId: string, defaultValue?: any, context?: Record<string, any>): Promise<any>;
    track(userId: string, metricKey: string, value?: number, properties?: Record<string, any>): void;
    flush(): Promise<void>;
    destroy(): void;
    private getAssignments;
}
export { murmurhash3, hashToFloat };
export default AbacusNode;
