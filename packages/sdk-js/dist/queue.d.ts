export interface TrackEvent {
    type: 'track' | 'page' | 'identify';
    key?: string;
    userId?: string;
    value?: number;
    properties?: Record<string, any>;
    timestamp: number;
}
export declare class EventQueue {
    private queue;
    private flushUrl;
    private apiKey;
    private maxSize;
    private flushInterval;
    private timer;
    private retryCount;
    private flushing;
    private destroyed;
    private boundBeaconFlush;
    constructor(flushUrl: string, apiKey: string, maxSize?: number, flushInterval?: number);
    push(event: TrackEvent): void;
    flush(): Promise<void>;
    destroy(): void;
    private startTimer;
    private bindPageUnload;
    private unbindPageUnload;
    private beaconFlush;
}
