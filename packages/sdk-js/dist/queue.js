const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;
export class EventQueue {
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
