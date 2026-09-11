// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ReloadGuardStorageService } from './reload-guard-storage.service';

const LAST_CHUNK_RELOAD_KEY = 'klacks.last-chunk-reload-at';
const CHUNK_RELOAD_AT_MS = 1_789_000_000_000;
const BUILD_KEY = '9a7e4b1c0d2f';

describe('ReloadGuardStorageService', () => {
  let storage: ReloadGuardStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(ReloadGuardStorageService);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('remembers the time of the last automatic chunk reload', () => {
    storage.writeLastChunkReloadAt(CHUNK_RELOAD_AT_MS);

    expect(storage.readLastChunkReloadAt()).toBe(CHUNK_RELOAD_AT_MS);
  });

  it('knows no chunk reload before one was recorded', () => {
    expect(storage.readLastChunkReloadAt()).toBeNull();
  });

  it('ignores a corrupted chunk reload time', () => {
    sessionStorage.setItem(LAST_CHUNK_RELOAD_KEY, 'not-a-number');

    expect(storage.readLastChunkReloadAt()).toBeNull();
  });

  it('remembers the build key this tab last reloaded for', () => {
    storage.writeReloadedBuildKey(BUILD_KEY);

    expect(storage.readReloadedBuildKey()).toBe(BUILD_KEY);
  });

  it('degrades to "nothing remembered" when the browser refuses session storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => storage.writeReloadedBuildKey(BUILD_KEY)).not.toThrow();
    expect(() => storage.writeLastChunkReloadAt(CHUNK_RELOAD_AT_MS)).not.toThrow();
    expect(storage.readReloadedBuildKey()).toBeNull();
    expect(storage.readLastChunkReloadAt()).toBeNull();
  });
});
