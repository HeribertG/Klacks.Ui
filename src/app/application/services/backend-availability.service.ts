// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tracks whether the backend is currently unreachable (e.g. still starting up on a freshly
 * installed database) and drives the "please wait" overlay instead of a hard error page. A failed
 * request is only a hint that starts a silent health poll; the overlay appears solely once the
 * health endpoint itself has failed AND the outage has outlasted the grace period. The grace
 * period is long while the backend has never answered in this browser tab, because then it is
 * simply still booting, and short once it has answered, because from then on an outage is a real
 * fault the user needs to hear about quickly. That "has answered" mark is kept in session storage
 * so it survives a reload: without it every F5 during an outage would look like a fresh start and
 * make the user stare at a dead page for the full startup grace period. Only responses from the
 * API count as an answer — assets such as the i18n bundles come from the web server and say
 * nothing about the backend. Only one poll loop ever runs at a time. The page is reloaded on
 * recovery only if the overlay was actually shown, because an unexplained reload during startup
 * looks like a defect.
 * @param url - Response URL reported to reportReachable, matched against the configured API base
 */
import { Injectable, signal } from '@angular/core';
import { environment } from 'src/environments/environment';

const PROBE_TIMEOUT_MS = 3000;
const STARTUP_GRACE_PERIOD_MS = 45000;
const OUTAGE_GRACE_PERIOD_MS = 10000;
const PROBE_INTERVAL_BEFORE_OVERLAY_MS = 1000;
const PROBE_INTERVAL_AFTER_OVERLAY_MS = 2000;
const BACKEND_ANSWERED_STORAGE_KEY = 'klacks.backend-has-answered';
const BACKEND_ANSWERED_STORAGE_VALUE = 'true';

@Injectable({ providedIn: 'root' })
export class BackendAvailabilityService {
  private readonly unavailableSignal = signal(false);
  private pollInProgress = false;
  private overlayWasShown = false;
  private backendHasAnswered = this.readAnsweredMark();

  readonly isUnavailable = this.unavailableSignal.asReadonly();

  reportReachable(url: string | null): void {
    if (url && url.includes(environment.baseUrl)) {
      this.markBackendAnswered();
    }
  }

  reportUnavailable(): void {
    if (this.pollInProgress) {
      return;
    }
    void this.pollUntilHealthy();
  }

  private async pollUntilHealthy(): Promise<void> {
    this.pollInProgress = true;
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
    this.pollInProgress = false;
    this.markBackendAnswered();
    if (this.overlayWasShown) {
      this.reloadPage();
      return;
    }
    this.unavailableSignal.set(false);
  }

  private reloadPage(): void {
    window.location.reload();
  }

  private markBackendAnswered(): void {
    this.backendHasAnswered = true;
    try {
      sessionStorage.setItem(BACKEND_ANSWERED_STORAGE_KEY, BACKEND_ANSWERED_STORAGE_VALUE);
    } catch {
      return;
    }
  }

  private readAnsweredMark(): boolean {
    try {
      return sessionStorage.getItem(BACKEND_ANSWERED_STORAGE_KEY) === BACKEND_ANSWERED_STORAGE_VALUE;
    } catch {
      return false;
    }
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
