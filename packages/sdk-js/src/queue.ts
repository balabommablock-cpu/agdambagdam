export interface TrackEvent {
  type: 'track' | 'page' | 'identify';
  key?: string;
  userId?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1s

/**
 * Event batching queue with automatic flushing and retry logic.
 */
export class EventQueue {
  private queue: TrackEvent[] = [];
  private flushUrl: string;
  private apiKey: string;
  private maxSize: number;
  private flushInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private retryCount: number = 0;
  private flushing: boolean = false;
  private destroyed: boolean = false;
  private boundBeaconFlush: (() => void) | null = null;

  constructor(
    flushUrl: string,
    apiKey: string,
    maxSize: number = 10,
    flushInterval: number = 5000
  ) {
    this.flushUrl = flushUrl;
    this.apiKey = apiKey;
    this.maxSize = maxSize;
    this.flushInterval = flushInterval;

    this.startTimer();
    this.bindPageUnload();
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
        keepalive: true,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      this.retryCount = 0;
    } catch {
      // Put events back at the front
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
      // Max retries exceeded — drop the batch to prevent infinite growth
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
    this.unbindPageUnload();
    // Final flush via beacon
    this.beaconFlush();
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private bindPageUnload(): void {
    if (typeof window === 'undefined') return;
    this.boundBeaconFlush = () => this.beaconFlush();
    window.addEventListener('visibilitychange', this.boundBeaconFlush);
    window.addEventListener('pagehide', this.boundBeaconFlush);
  }

  private unbindPageUnload(): void {
    if (typeof window === 'undefined' || !this.boundBeaconFlush) return;
    window.removeEventListener('visibilitychange', this.boundBeaconFlush);
    window.removeEventListener('pagehide', this.boundBeaconFlush);
  }

  private beaconFlush(): void {
    if (this.queue.length === 0) return;
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
