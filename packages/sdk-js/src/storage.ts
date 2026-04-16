const STORAGE_PREFIX = 'abacus_';

interface StorageEntry {
  v: any;
  e?: number; // expiry timestamp
}

/**
 * LocalStorage wrapper with TTL support and in-memory fallback.
 */
export class Storage {
  private memoryStore: Map<string, StorageEntry> = new Map();
  private useLocalStorage: boolean;

  constructor() {
    this.useLocalStorage = this.checkLocalStorage();
  }

  private checkLocalStorage(): boolean {
    try {
      const testKey = STORAGE_PREFIX + '__test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  get(key: string): any {
    const fullKey = STORAGE_PREFIX + key;

    if (this.useLocalStorage) {
      try {
        const raw = localStorage.getItem(fullKey);
        if (raw === null) return undefined;
        const entry: StorageEntry = JSON.parse(raw);
        if (entry.e && Date.now() > entry.e) {
          localStorage.removeItem(fullKey);
          return undefined;
        }
        return entry.v;
      } catch {
        return undefined;
      }
    }

    const entry = this.memoryStore.get(fullKey);
    if (!entry) return undefined;
    if (entry.e && Date.now() > entry.e) {
      this.memoryStore.delete(fullKey);
      return undefined;
    }
    return entry.v;
  }

  set(key: string, value: any, ttl?: number): void {
    const fullKey = STORAGE_PREFIX + key;
    const entry: StorageEntry = { v: value };
    if (ttl) {
      entry.e = Date.now() + ttl;
    }

    if (this.useLocalStorage) {
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry));
        return;
      } catch {
        // Storage full or blocked — fall through to memory
      }
    }

    this.memoryStore.set(fullKey, entry);
  }

  remove(key: string): void {
    const fullKey = STORAGE_PREFIX + key;
    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(fullKey);
      } catch {
        // ignore
      }
    }
    this.memoryStore.delete(fullKey);
  }

  clear(): void {
    if (this.useLocalStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
    this.memoryStore.clear();
  }
}
