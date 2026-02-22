// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { InMemoryStorageService } from './in-memory-storage.service';

describe('InMemoryStorageService', () => {
    let service: InMemoryStorageService;
    const testKey = 'test_filter_key';
    const testFilter = { searchString: 'test', pageSize: 10 };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [InMemoryStorageService]
        });
        service = TestBed.inject(InMemoryStorageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should save and restore filter', async () => {
        // Save filter
        const saveResult = await service.saveFilter(testKey, testFilter);
        expect(saveResult).toBe(true);

        // Restore filter
        const restoredFilter = await service.restoreFilter(testKey);
        expect(restoredFilter).toEqual(testFilter);
    });

    it('should return null for non-existent filter', async () => {
        const result = await service.restoreFilter('non_existent_key');
        expect(result).toBeNull();
    });

    it('should remove filter', async () => {
        // Save filter first
        await service.saveFilter(testKey, testFilter);

        // Remove filter
        const removeResult = await service.removeFilter(testKey);
        expect(removeResult).toBe(true);

        // Verify it's gone
        const restoredFilter = await service.restoreFilter(testKey);
        expect(restoredFilter).toBeNull();
    });

    it('should check availability', async () => {
        const isAvailable = await service.isAvailable();
        expect(isAvailable).toBe(true);
    });

    it('should handle unavailable storage', async () => {
        service.setSuppressWarnings(true);
        service.setAvailable(false);

        const saveResult = await service.saveFilter(testKey, testFilter);
        expect(saveResult).toBe(false);

        const restoreResult = await service.restoreFilter(testKey);
        expect(restoreResult).toBeNull();

        const removeResult = await service.removeFilter(testKey);
        expect(removeResult).toBe(false);

        // Reset for other tests
        service.setAvailable(true);
        service.setSuppressWarnings(false);
    });

    it('should get keys with prefix', async () => {
        const testPrefix = 'test_prefix_';
        const key1 = testPrefix + 'key1';
        const key2 = testPrefix + 'key2';
        const key3 = 'other_key';

        // Save test filters
        await service.saveFilter(key1, testFilter);
        await service.saveFilter(key2, testFilter);
        await service.saveFilter(key3, testFilter);

        // Get keys with prefix
        const keys = await service.getKeys(testPrefix);
        expect(keys).toContain(key1);
        expect(keys).toContain(key2);
        expect(keys).not.toContain(key3);
    });

    it('should clear filters with prefix', async () => {
        const testPrefix = 'clear_test_';
        const key1 = testPrefix + 'key1';
        const key2 = testPrefix + 'key2';
        const key3 = 'other_key';

        // Save test filters
        await service.saveFilter(key1, testFilter);
        await service.saveFilter(key2, testFilter);
        await service.saveFilter(key3, testFilter);

        // Clear with prefix
        const clearResult = await service.clear(testPrefix);
        expect(clearResult).toBe(true);

        // Verify filters with prefix are gone
        const restoredFilter1 = await service.restoreFilter(key1);
        const restoredFilter2 = await service.restoreFilter(key2);
        const restoredFilter3 = await service.restoreFilter(key3);

        expect(restoredFilter1).toBeNull();
        expect(restoredFilter2).toBeNull();
        expect(restoredFilter3).toEqual(testFilter); // Should still exist
    });

    it('should provide utility methods', async () => {
        expect(service.size()).toBe(0);
        expect(service.hasKey(testKey)).toBe(false);

        await service.saveFilter(testKey, testFilter);

        expect(service.size()).toBe(1);
        expect(service.hasKey(testKey)).toBe(true);
    });
});
