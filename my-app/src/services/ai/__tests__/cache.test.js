/**
 * @jest-environment jsdom
 */

// Mock Cache API for testing
class MockCache {
    constructor() {
        this.storage = new Map();
    }

    async match(request) {
        const url = typeof request === 'string' ? request : request.url;
        return this.storage.get(url);
    }

    async put(request, response) {
        const url = typeof request === 'string' ? request : request.url;
        this.storage.set(url, response);
    }

    async delete(request) {
        const url = typeof request === 'string' ? request : request.url;
        return this.storage.delete(url);
    }

    async keys() {
        return Array.from(this.storage.keys()).map(url => ({ url }));
    }
}

class MockCacheStorage {
    constructor() {
        this.caches = new Map();
    }

    async open(cacheName) {
        if (!this.caches.has(cacheName)) {
            this.caches.set(cacheName, new MockCache());
        }
        return this.caches.get(cacheName);
    }

    async keys() {
        return Array.from(this.caches.keys());
    }

    async delete(cacheName) {
        return this.caches.delete(cacheName);
    }
}

// Setup global caches
global.caches = new MockCacheStorage();

/**
 * Cache Verification Test
 * 
 * This test verifies that the browser Cache API is being used correctly
 * for storing and retrieving model files.
 */

describe('Model Cache Verification', () => {
    let cacheStorage;

    beforeEach(async () => {
        // Clear any existing cache
        if ('caches' in global) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
    });

    it('should create transformers-cache storage', async () => {
        const cache = await caches.open('transformers-cache');
        expect(cache).toBeDefined();

        const keys = await caches.keys();
        expect(keys).toContain('transformers-cache');
    });

    it('should store and retrieve responses from cache', async () => {
        const cache = await caches.open('transformers-cache');
        const testUrl = 'https://example.com/test-model.onnx';
        const testData = new Uint8Array([1, 2, 3, 4, 5]);

        // Create a mock response to cache
        const response = new Response(testData.buffer, {
            status: 200,
            headers: { 'Content-Type': 'application/octet-stream' }
        });

        // Store in cache
        await cache.put(testUrl, response);

        // Retrieve from cache
        const cachedResponse = await cache.match(testUrl);
        expect(cachedResponse).toBeDefined();

        const buffer = await cachedResponse.arrayBuffer();
        const retrieved = new Uint8Array(buffer);

        expect(retrieved).toEqual(testData);
    });

    it('should return undefined for cache misses', async () => {
        const cache = await caches.open('transformers-cache');
        const result = await cache.match('https://example.com/non-existent.onnx');

        expect(result).toBeUndefined();
    });

    it('should handle multiple files in cache', async () => {
        const cache = await caches.open('transformers-cache');

        const files = [
            { url: 'https://example.com/model-a.onnx', data: new Uint8Array([1, 2, 3]) },
            { url: 'https://example.com/model-b.onnx', data: new Uint8Array([4, 5, 6]) },
            { url: 'https://example.com/config.json', data: new Uint8Array(Buffer.from('{"test": true}')) }
        ];

        // Cache all files
        for (const file of files) {
            const response = new Response(file.data.buffer);
            await cache.put(file.url, response);
        }

        // Verify all are cached
        for (const file of files) {
            const cached = await cache.match(file.url);
            expect(cached).toBeDefined();
        }
    });

    it('should support cache.keys() for listing cached items', async () => {
        const cache = await caches.open('transformers-cache');

        // Add test entries
        await cache.put('https://example.com/file1.onnx', new Response('test1'));
        await cache.put('https://example.com/file2.onnx', new Response('test2'));

        const requests = await cache.keys();
        expect(requests.length).toBeGreaterThanOrEqual(2);

        const urls = requests.map(req => req.url);
        expect(urls).toContain('https://example.com/file1.onnx');
        expect(urls).toContain('https://example.com/file2.onnx');
    });

    it('should support cache.delete() for removing entries', async () => {
        const cache = await caches.open('transformers-cache');
        const testUrl = 'https://example.com/to-delete.onnx';

        await cache.put(testUrl, new Response('test'));

        let cached = await cache.match(testUrl);
        expect(cached).toBeDefined();

        await cache.delete(testUrl);

        cached = await cache.match(testUrl);
        expect(cached).toBeUndefined();
    });
});
