// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AppVersionWatchService } from './app-version-watch.service';
import { AppReloadRequestService } from './app-reload-request.service';
import { BackendAvailabilityService } from './backend-availability.service';
import { ChunkLoadRecoveryService } from './chunk-load-recovery.service';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { DEV_BUILD_KEY, DEV_BUILD_VERSION } from 'src/app/domain/constants/build-info.constants';
import { APP_VERSION_SOURCE } from 'src/app/domain/interfaces/app-version-source.interface';
import { BUILD_INFO, IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';
import { REALTIME_CONNECTION_STATUS } from 'src/app/domain/interfaces/realtime-connection-status.interface';
import { IReloadGuardStorage, RELOAD_GUARD_STORAGE } from 'src/app/domain/interfaces/reload-guard-storage.interface';

const RUNNING_BUILD: IBuildInfo = { version: '1.0.27', buildKey: '5d1f0c2e9b3a' };
const DEPLOYED_BUILD: IBuildInfo = { version: '1.0.28', buildKey: '9a7e4b1c0d2f' };
const DEV_BUILD: IBuildInfo = { version: DEV_BUILD_VERSION, buildKey: DEV_BUILD_KEY };
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const RECONNECT_RECHECK_DELAY_MS = 2 * 60 * 1000;
const VERSION_RELOAD = { reason: AppReloadReason.Version, autoReloadAllowed: true };

describe('AppVersionWatchService', () => {
  let fetchDeployedBuildInfo: ReturnType<typeof vi.fn>;
  let requestReload: ReturnType<typeof vi.fn>;
  let connected$: Subject<boolean>;
  let outageEnded$: Subject<void>;
  let chunkLoadFailed$: Subject<void>;
  let reloadedBuildKey: string | null;
  let visibility: DocumentVisibilityState;

  const guardStorage: IReloadGuardStorage = {
    readLastChunkReloadAt: () => null,
    writeLastChunkReloadAt: () => undefined,
    readReloadedBuildKey: () => reloadedBuildKey,
    writeReloadedBuildKey: (buildKey: string) => {
      reloadedBuildKey = buildKey;
    },
  };

  const settle = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(0);
  };

  const startWatch = (buildInfo: IBuildInfo = RUNNING_BUILD): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BUILD_INFO, useValue: buildInfo },
        { provide: APP_VERSION_SOURCE, useValue: { fetchDeployedBuildInfo } },
        { provide: REALTIME_CONNECTION_STATUS, useValue: { connected$ } },
        { provide: BackendAvailabilityService, useValue: { outageEnded$ } },
        { provide: ChunkLoadRecoveryService, useValue: { chunkLoadFailed$ } },
        { provide: AppReloadRequestService, useValue: { requestReload } },
        { provide: RELOAD_GUARD_STORAGE, useValue: guardStorage },
      ],
    });
    TestBed.inject(AppVersionWatchService).start();
  };

  const becomeVisible = async (): Promise<void> => {
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    fetchDeployedBuildInfo = vi.fn().mockResolvedValue(DEPLOYED_BUILD);
    requestReload = vi.fn();
    connected$ = new Subject<boolean>();
    outageEnded$ = new Subject<void>();
    chunkLoadFailed$ = new Subject<void>();
    reloadedBuildKey = null;
    visibility = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    Reflect.deleteProperty(document, 'visibilityState');
    vi.useRealTimers();
  });

  it('never checks in a development build', async () => {
    startWatch(DEV_BUILD);

    await becomeVisible();
    outageEnded$.next();
    chunkLoadFailed$.next();
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

    expect(fetchDeployedBuildInfo).not.toHaveBeenCalled();
  });

  describe('detection', () => {
    it('reports a newer deployed build when the tab becomes visible', async () => {
      startWatch();

      await becomeVisible();

      expect(requestReload).toHaveBeenCalledWith(VERSION_RELOAD);
    });

    it('does not check while the tab stays hidden', async () => {
      startWatch();

      document.dispatchEvent(new Event('visibilitychange'));
      await settle();

      expect(fetchDeployedBuildInfo).not.toHaveBeenCalled();
    });

    it('stays quiet when the deployed build is the running one', async () => {
      fetchDeployedBuildInfo.mockResolvedValue(RUNNING_BUILD);
      startWatch();

      await becomeVisible();

      expect(requestReload).not.toHaveBeenCalled();
    });

    it('stays quiet when the version file cannot be read', async () => {
      fetchDeployedBuildInfo.mockResolvedValue(null);
      startWatch();

      await becomeVisible();

      expect(requestReload).not.toHaveBeenCalled();
    });

    it('reports a new build key only once', async () => {
      startWatch();

      await becomeVisible();
      await becomeVisible();

      expect(fetchDeployedBuildInfo).toHaveBeenCalledTimes(2);
      expect(requestReload).toHaveBeenCalledTimes(1);
    });

    it('does not remember the build key before the page actually reloads', async () => {
      startWatch();

      await becomeVisible();

      expect(reloadedBuildKey).toBeNull();
    });

    it('remembers the reported build key at the moment the page reloads', async () => {
      startWatch();
      await becomeVisible();

      TestBed.inject(AppVersionWatchService).recordReload();

      expect(reloadedBuildKey).toBe(DEPLOYED_BUILD.buildKey);
    });

    it('records nothing for a reload when no newer build was reported', async () => {
      fetchDeployedBuildInfo.mockResolvedValue(RUNNING_BUILD);
      startWatch();
      await becomeVisible();

      TestBed.inject(AppVersionWatchService).recordReload();

      expect(reloadedBuildKey).toBeNull();
    });

    it('forbids the automatic reload when this tab already reloaded for that build key', async () => {
      reloadedBuildKey = DEPLOYED_BUILD.buildKey;
      startWatch();

      await becomeVisible();

      expect(requestReload).toHaveBeenCalledWith({ ...VERSION_RELOAD, autoReloadAllowed: false });
    });
  });

  describe('triggers', () => {
    it('checks every thirty minutes', async () => {
      startWatch();

      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS - 1);
      expect(fetchDeployedBuildInfo).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(fetchDeployedBuildInfo).toHaveBeenCalledTimes(1);
    });

    it('does not check on the first connection of the realtime hub', async () => {
      startWatch();

      connected$.next(false);
      connected$.next(true);
      await settle();

      expect(fetchDeployedBuildInfo).not.toHaveBeenCalled();
    });

    it('checks right after a reconnect and again two minutes later, when the UI has been replaced too', async () => {
      fetchDeployedBuildInfo.mockResolvedValueOnce(RUNNING_BUILD).mockResolvedValue(DEPLOYED_BUILD);
      startWatch();

      connected$.next(true);
      connected$.next(false);
      connected$.next(true);
      await settle();

      expect(fetchDeployedBuildInfo).toHaveBeenCalledTimes(1);
      expect(requestReload).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(RECONNECT_RECHECK_DELAY_MS);

      expect(fetchDeployedBuildInfo).toHaveBeenCalledTimes(2);
      expect(requestReload).toHaveBeenCalledWith(VERSION_RELOAD);
    });

    it('checks when a backend outage ends', async () => {
      startWatch();

      outageEnded$.next();
      await settle();

      expect(fetchDeployedBuildInfo).toHaveBeenCalledTimes(1);
    });

    it('checks when a chunk failed to load', async () => {
      startWatch();

      chunkLoadFailed$.next();
      await settle();

      expect(fetchDeployedBuildInfo).toHaveBeenCalledTimes(1);
    });
  });
});
