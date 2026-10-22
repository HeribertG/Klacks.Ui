// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ReturnUrlMemoryService } from './return-url-memory.service';

describe('ReturnUrlMemoryService', () => {
  const MAX_AGE_MS = 30 * 60 * 1000;
  let service: ReturnUrlMemoryService;
  let store: Record<string, string>;

  const localStorageStub = {
    remove: (key: string): void => {
      delete store[key];
    },
    getJson: (key: string): any => (key in store ? JSON.parse(store[key]) : null),
    setJson: (key: string, value: any): void => {
      store[key] = JSON.stringify(value);
    },
  };

  beforeEach(() => {
    store = {};
    TestBed.configureTestingModule({
      providers: [ReturnUrlMemoryService, { provide: LocalStorageService, useValue: localStorageStub }],
    });
    service = TestBed.inject(ReturnUrlMemoryService);
  });

  it('remembers a workplace page with a timestamp', () => {
    service.remember('/workplace/edit-shift/7?readonly=true');

    const stored = JSON.parse(store[StorageKeys.RETURN_URL]);
    expect(stored.url).toBe('/workplace/edit-shift/7?readonly=true');
    expect(typeof stored.ts).toBe('number');
  });

  it('clears the entry instead of remembering the dashboard or a non-workplace page', () => {
    for (const url of ['/workplace/dashboard', '/workplace/dashboard?tab=1', '/login', '']) {
      store[StorageKeys.RETURN_URL] = JSON.stringify({ url: '/workplace/edit-shift/1', ts: Date.now() });

      service.remember(url);

      expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
    }
  });

  it('consumes a fresh entry once', () => {
    store[StorageKeys.RETURN_URL] = JSON.stringify({ url: '/workplace/edit-shift/123', ts: Date.now() });

    expect(service.consume()).toBe('/workplace/edit-shift/123');
    expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
    expect(service.consume()).toBeNull();
  });

  it('drops a stale, malformed or no longer restorable entry', () => {
    const entries = [
      { url: '/workplace/edit-shift/123', ts: Date.now() - MAX_AGE_MS - 60 * 1000 },
      { url: 42, ts: Date.now() },
      { url: '/workplace/edit-shift/123' },
      { url: '/workplace/dashboard', ts: Date.now() },
    ];

    for (const entry of entries) {
      store[StorageKeys.RETURN_URL] = JSON.stringify(entry);

      expect(service.consume()).toBeNull();
      expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
    }
  });
});
