export declare class Storage {
    private memoryStore;
    private useLocalStorage;
    constructor();
    private checkLocalStorage;
    get(key: string): any;
    set(key: string, value: any, ttl?: number): void;
    remove(key: string): void;
    clear(): void;
}
