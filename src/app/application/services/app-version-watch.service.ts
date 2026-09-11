// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Detects that a newer UI build has been deployed while this tab keeps running the old bundle, by
 * comparing the build key compiled into the bundle with the one in the deployed version file. Checks
 * when the tab becomes visible, every 30 minutes, right after the realtime connection comes back
 * after a drop and again 2 minutes later (the updater replaces the API before the UI), when a backend
 * outage ends and when a chunk failed to load. A new build is reported once per build key. The
 * reload coordinator calls recordReload() at the moment it actually reloads the page, which remembers
 * the last reported build key for this tab. If this tab already reloaded for that build key and still
 * runs another bundle, the report forbids the automatic reload, so a stale bundle served from a cache
 * cannot cause a reload loop. Runs on the login page too and is switched off entirely for development
 * builds.
 * @param buildInfo - Build identity compiled into the running bundle
 */
import { DestroyRef, Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { APP_VERSION_SOURCE } from 'src/app/domain/interfaces/app-version-source.interface';
import { BUILD_INFO, IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';
import { REALTIME_CONNECTION_STATUS } from 'src/app/domain/interfaces/realtime-connection-status.interface';
import { RELOAD_GUARD_STORAGE } from 'src/app/domain/interfaces/reload-guard-storage.interface';
import { isDevBuild } from 'src/app/domain/helpers/build-info.helper';
import { AppReloadRequestService } from './app-reload-request.service';
import { BackendAvailabilityService } from './backend-availability.service';
import { ChunkLoadRecoveryService } from './chunk-load-recovery.service';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const RECONNECT_RECHECK_DELAY_MS = 2 * 60 * 1000;
const VISIBILITY_CHANGE_EVENT = 'visibilitychange';
const VISIBLE_STATE: DocumentVisibilityState = 'visible';

@Injectable({
  providedIn: 'root',
})
export class AppVersionWatchService {
  private readonly buildInfo = inject(BUILD_INFO);
  private readonly versionSource = inject(APP_VERSION_SOURCE);
  private readonly connectionStatus = inject(REALTIME_CONNECTION_STATUS);
  private readonly backendAvailability = inject(BackendAvailabilityService);
  private readonly chunkLoadRecovery = inject(ChunkLoadRecoveryService);
  private readonly reloadRequests = inject(AppReloadRequestService);
  private readonly guardStorage = inject(RELOAD_GUARD_STORAGE);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reportedBuildKeys = new Set<string>();
  private lastReportedBuildKey: string | null = null;
  private started = false;
  private checkInFlight = false;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private recheckTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onVisibilityChange = (): void => {
    if (this.document.visibilityState === VISIBLE_STATE) {
      void this.check();
    }
  };

  start(): void {
    if (this.started || isDevBuild(this.buildInfo)) {
      return;
    }
    this.started = true;

    this.document.addEventListener(VISIBILITY_CHANGE_EVENT, this.onVisibilityChange);
    this.intervalTimer = setInterval(() => void this.check(), CHECK_INTERVAL_MS);
    this.watchReconnects();
    this.backendAvailability.outageEnded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.check());
    this.chunkLoadRecovery.chunkLoadFailed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.check());
    this.destroyRef.onDestroy(() => this.stop());
  }

  recordReload(): void {
    if (this.lastReportedBuildKey !== null) {
      this.guardStorage.writeReloadedBuildKey(this.lastReportedBuildKey);
    }
  }

  private watchReconnects(): void {
    let connectedBefore = false;
    this.connectionStatus.connected$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((connected) => {
        if (connected && connectedBefore) {
          this.onReconnected();
        }
        connectedBefore = connectedBefore || connected;
      });
  }

  private onReconnected(): void {
    void this.check();
    if (this.recheckTimer !== null) {
      clearTimeout(this.recheckTimer);
    }
    this.recheckTimer = setTimeout(() => {
      this.recheckTimer = null;
      void this.check();
    }, RECONNECT_RECHECK_DELAY_MS);
  }

  private async check(): Promise<void> {
    if (this.checkInFlight) {
      return;
    }
    this.checkInFlight = true;
    try {
      const deployed = await this.versionSource.fetchDeployedBuildInfo();
      if (deployed) {
        this.report(deployed);
      }
    } finally {
      this.checkInFlight = false;
    }
  }

  private report(deployed: IBuildInfo): void {
    if (deployed.buildKey === this.buildInfo.buildKey || this.reportedBuildKeys.has(deployed.buildKey)) {
      return;
    }
    this.reportedBuildKeys.add(deployed.buildKey);
    this.lastReportedBuildKey = deployed.buildKey;

    const reloadAlreadyAttempted = this.guardStorage.readReloadedBuildKey() === deployed.buildKey;
    this.reloadRequests.requestReload({
      reason: AppReloadReason.Version,
      autoReloadAllowed: !reloadAlreadyAttempted,
    });
  }

  private stop(): void {
    this.document.removeEventListener(VISIBILITY_CHANGE_EVENT, this.onVisibilityChange);
    if (this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
    }
    if (this.recheckTimer !== null) {
      clearTimeout(this.recheckTimer);
    }
  }
}
