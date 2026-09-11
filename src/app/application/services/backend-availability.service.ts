// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tracks whether the backend is currently unreachable (e.g. still starting up on a freshly
 * installed database) and drives the "please wait" overlay instead of a hard error page. A failed
 * request is only a hint that starts a silent health poll; the overlay appears solely once the
 * health endpoint itself has failed AND the outage has outlasted the grace period. The grace
 * period is long while the backend has never answered in this browser tab, because then it is
 * simply still booting, and short once it has answered, because from then on an outage is a real
 * fault the user needs to hear about quickly. That "has answered" mark is kept by
 * BackendAnsweredStorageService so it survives a reload: without it every F5 during an outage
 * would look like a fresh start and make the user stare at a dead page for the full startup
 * grace period. Only responses from the
 * API count as an answer — assets such as the i18n bundles come from the web server and say
 * nothing about the backend. Only one poll loop ever runs at a time. On recovery the overlay is
 * hidden and, only if it was actually shown, a page reload is requested through
 * AppReloadRequestService - an unexplained reload during startup looks like a defect, and whether
 * and when the reload happens is decided by the presentation layer, which protects unsaved work.
 * Every end of an outage is announced on outageEnded$, because a backend that was down may have
 * been updated. While a poll loop runs the outage is public knowledge, so error toasts and
 * the loading spinner can stay silent instead of drowning the user in noise about a backend that
 * is simply gone.
 * @param url - Response URL reported to reportReachable, matched against the configured API base
 */
import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BackendAnsweredStorageService } from 'src/app/infrastructure/storage/backend-answered-storage.service';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { AppReloadRequestService } from './app-reload-request.service';

const PROBE_TIMEOUT_MS = 3000;
const STARTUP_GRACE_PERIOD_MS = 45000;
const OUTAGE_GRACE_PERIOD_MS = 10000;
const PROBE_INTERVAL_BEFORE_OVERLAY_MS = 1000;
const PROBE_INTERVAL_AFTER_OVERLAY_MS = 2000;

@Injectable({ providedIn: 'root' })
export class BackendAvailabilityService {
  private readonly answeredStorage = inject(BackendAnsweredStorageService);
  private readonly reloadRequests = inject(AppReloadRequestService);
  private readonly unavailableSignal = signal(false);
  private readonly outageSuspectedSignal = signal(false);
  private readonly outageEnded = new Subject<void>();
  private overlayWasShown = false;
  private backendHasAnswered = this.answeredStorage.isMarked();

  readonly isUnavailable = this.unavailableSignal.asReadonly();
  readonly isOutageSuspected = this.outageSuspectedSignal.asReadonly();
  readonly outageEnded$ = this.outageEnded.asObservable();

  reportReachable(url: string | null): void {
    if (url && url.includes(environment.baseUrl)) {
      this.markBackendAnswered();
    }
  }

  reportUnavailable(): void {
    if (this.outageSuspectedSignal()) {
      return;
    }
    void this.pollUntilHealthy();
  }

  private async pollUntilHealthy(): Promise<void> {
    this.outageSuspectedSignal.set(true);
    const outageStartedAt = performance.now();
    while (!(await this.probeHealth())) {
      if (performance.now() - outageStartedAt >= this.gracePeriodMs()) {
        this.showOverlay();
      }
      await this.wait(
        this.overlayWasShown ? PROBE_INTERVAL_AFTER_OVERLAY_MS : PROBE_INTERVAL_BEFORE_OVERLAY_MS
      );
    }
    this.endOutage();
  }

  private gracePeriodMs(): number {
    return this.backendHasAnswered ? OUTAGE_GRACE_PERIOD_MS : STARTUP_GRACE_PERIOD_MS;
  }

  private showOverlay(): void {
    this.overlayWasShown = true;
    this.unavailableSignal.set(true);
  }

  private endOutage(): void {
    const overlayWasShown = this.overlayWasShown;
    this.overlayWasShown = false;
    this.outageSuspectedSignal.set(false);
    this.unavailableSignal.set(false);
    this.markBackendAnswered();
    this.outageEnded.next();
    if (overlayWasShown) {
      this.reloadRequests.requestReload({ reason: AppReloadReason.Outage, autoReloadAllowed: true });
    }
  }

  private markBackendAnswered(): void {
    this.backendHasAnswered = true;
    this.answeredStorage.mark();
  }

  private wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private async probeHealth(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(environment.healthUrl, { method: 'GET', signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
