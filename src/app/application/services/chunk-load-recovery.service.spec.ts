// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Event as RouterEvent, NavigationError, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ChunkLoadRecoveryService } from './chunk-load-recovery.service';
import { AppReloadRequestService } from './app-reload-request.service';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { IReloadGuardStorage, RELOAD_GUARD_STORAGE } from 'src/app/domain/interfaces/reload-guard-storage.interface';

const TARGET_URL = '/workplace/schedule';
const CHUNK_ERROR = new TypeError('Failed to fetch dynamically imported module: https://klacks.example/chunk-7QX2LMNB.js');
const OTHER_ERROR = new Error("Cannot match any routes. URL Segment: 'nowhere'");
const NOW = new Date('2026-09-10T10:00:00Z');
const CHUNK_RELOAD_MIN_INTERVAL_MS = 60000;
const ONE_SECOND_MS = 1000;
const NAVIGATION_ID = 7;

describe('ChunkLoadRecoveryService', () => {
  let service: ChunkLoadRecoveryService;
  let routerEvents: Subject<RouterEvent>;
  let requestReload: ReturnType<typeof vi.fn>;
  let lastChunkReloadAt: number | null;

  const guardStorage: IReloadGuardStorage = {
    readLastChunkReloadAt: () => lastChunkReloadAt,
    writeLastChunkReloadAt: (timestampMs: number) => {
      lastChunkReloadAt = timestampMs;
    },
    readReloadedBuildKey: () => null,
    writeReloadedBuildKey: () => undefined,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    routerEvents = new Subject<RouterEvent>();
    requestReload = vi.fn();
    lastChunkReloadAt = null;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: routerEvents } },
        { provide: AppReloadRequestService, useValue: { requestReload } },
        { provide: RELOAD_GUARD_STORAGE, useValue: guardStorage },
      ],
    });
    service = TestBed.inject(ChunkLoadRecoveryService);
    service.start();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  describe('start()', () => {
    it('subscribes to router events only once even when called twice', () => {
      service.start();

      routerEvents.next(new NavigationError(NAVIGATION_ID, TARGET_URL, CHUNK_ERROR));

      expect(requestReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation errors', () => {
    it('asks for a reload of the URL the user tried to open when its chunk is missing', () => {
      routerEvents.next(new NavigationError(NAVIGATION_ID, TARGET_URL, CHUNK_ERROR));

      expect(requestReload).toHaveBeenCalledWith({
        reason: AppReloadReason.Chunk,
        targetUrl: TARGET_URL,
        autoReloadAllowed: true,
      });
    });

    it('ignores navigation errors that are not chunk failures', () => {
      routerEvents.next(new NavigationError(NAVIGATION_ID, TARGET_URL, OTHER_ERROR));

      expect(requestReload).not.toHaveBeenCalled();
    });
  });

  describe('errors from the global error handler', () => {
    it('takes over a chunk failure and asks for a reload of the current page', () => {
      expect(service.handleError(CHUNK_ERROR)).toBe(true);
      expect(requestReload).toHaveBeenCalledWith({
        reason: AppReloadReason.Chunk,
        targetUrl: undefined,
        autoReloadAllowed: true,
      });
    });

    it('leaves every other error to the error handler', () => {
      expect(service.handleError(OTHER_ERROR)).toBe(false);
      expect(requestReload).not.toHaveBeenCalled();
    });
  });

  it('announces every chunk failure so the version check can run', () => {
    const failures = vi.fn();
    service.chunkLoadFailed$.subscribe(failures);

    service.handleError(CHUNK_ERROR);
    routerEvents.next(new NavigationError(NAVIGATION_ID, TARGET_URL, CHUNK_ERROR));

    expect(failures).toHaveBeenCalledTimes(2);
  });

  describe('reload loop protection', () => {
    it('records when a chunk reload happens', () => {
      service.recordReload();

      expect(lastChunkReloadAt).toBe(NOW.getTime());
    });

    it('forbids a second automatic chunk reload within 60 seconds', () => {
      service.recordReload();
      vi.advanceTimersByTime(CHUNK_RELOAD_MIN_INTERVAL_MS - ONE_SECOND_MS);

      service.handleError(CHUNK_ERROR);

      expect(requestReload).toHaveBeenCalledWith(expect.objectContaining({ autoReloadAllowed: false }));
    });

    it('allows an automatic chunk reload again after 60 seconds', () => {
      service.recordReload();
      vi.advanceTimersByTime(CHUNK_RELOAD_MIN_INTERVAL_MS);

      service.handleError(CHUNK_ERROR);

      expect(requestReload).toHaveBeenCalledWith(expect.objectContaining({ autoReloadAllowed: true }));
    });
  });
});
