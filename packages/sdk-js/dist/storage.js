const STORAGE_PREFIX = 'abacus_';
export class Storage {
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
