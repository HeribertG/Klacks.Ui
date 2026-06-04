// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavigationService } from './navigation.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

describe('NavigationService', () => {
  let service: NavigationService;
  let router: any;
  let store: Record<string, string>;

  const localStorageStub = {
    get: (key: string): string | null => (key in store ? store[key] : null),
    set: (key: string, value: string): void => {
      store[key] = value;
    },
    remove: (key: string): void => {
      delete store[key];
    },
    getJson: (key: string): any => {
      const item = key in store ? store[key] : null;
      return item ? JSON.parse(item) : null;
    },
    setJson: (key: string, value: any): void => {
      store[key] = JSON.stringify(value);
    },
  };

  beforeEach(() => {
    store = {};
    router = {
      url: '/workplace/dashboard',
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: Router, useValue: router },
        { provide: LocalStorageService, useValue: localStorageStub },
      ],
    });

    service = TestBed.inject(NavigationService);
  });

  describe('redirectToLogin', () => {
    it('stores a restorable workplace url and navigates to root', () => {
      router.url = '/workplace/edit-shift/123';

      service.redirectToLogin();

      const stored = JSON.parse(store[StorageKeys.RETURN_URL]);
      expect(stored.url).toBe('/workplace/edit-shift/123');
      expect(typeof stored.ts).toBe('number');
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('uses the explicit target url when provided', () => {
      service.redirectToLogin('/workplace/edit-address/42?readonly=true');

      const stored = JSON.parse(store[StorageKeys.RETURN_URL]);
      expect(stored.url).toBe('/workplace/edit-address/42?readonly=true');
    });

    it('does not store the dashboard route', () => {
      service.redirectToLogin('/workplace/dashboard');

      expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('does not store non-workplace routes and clears a stale entry', () => {
      store[StorageKeys.RETURN_URL] = JSON.stringify({
        url: '/workplace/edit-shift/1',
        ts: Date.now(),
      });

      service.redirectToLogin('/login');

      expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
    });
  });

  describe('navigateAfterLogin', () => {
    it('restores a fresh stored url and consumes it', () => {
      store[StorageKeys.RETURN_URL] = JSON.stringify({
        url: '/workplace/edit-shift/123',
        ts: Date.now(),
      });

      service.navigateAfterLogin();

      expect(router.navigateByUrl).toHaveBeenCalledWith(
        '/workplace/edit-shift/123'
      );
      expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
    });

    it('falls back to workplace when no url is stored', () => {
      service.navigateAfterLogin();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/workplace']);
    });

    it('ignores a stale url and falls back to workplace', () => {
      const staleTs = Date.now() - 31 * 60 * 1000;
      store[StorageKeys.RETURN_URL] = JSON.stringify({
        url: '/workplace/edit-shift/123',
        ts: staleTs,
      });

      service.navigateAfterLogin();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/workplace']);
      expect(store[StorageKeys.RETURN_URL]).toBeUndefined();
    });

    it('falls back to workplace when restore navigation is rejected', async () => {
      router.navigateByUrl.mockResolvedValue(false);
      store[StorageKeys.RETURN_URL] = JSON.stringify({
        url: '/workplace/edit-shift/123',
        ts: Date.now(),
      });

      service.navigateAfterLogin();
      await Promise.resolve();

      expect(router.navigate).toHaveBeenCalledWith(['/workplace']);
    });
  });
});
