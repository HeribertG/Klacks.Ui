// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tracks whether the backend is currently unreachable (e.g. still starting up on a freshly
 * installed database) and drives the "please wait" overlay instead of a hard error page. Only one
 * poll loop against the health endpoint ever runs at a time; once it succeeds the page reloads to
 * cleanly resume everything that failed while the backend was down.
 */
import { Injectable, signal } from '@angular/core';
import { environment } from 'src/environments/environment';

const PROBE_TIMEOUT_MS = 3000;
const RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 5000, 10000];

@Injectable({ providedIn: 'root' })
export class BackendAvailabilityService {
  private readonly unavailableSignal = signal(false);
  private pollInProgress = false;

  readonly isUnavailable = this.unavailableSignal.asReadonly();

  reportUnavailable(): void {
    if (this.unavailableSignal()) {
      return;
    }
    this.unavailableSignal.set(true);
    void this.pollUntilHealthy();
  }

  private async pollUntilHealthy(): Promise<void> {
    if (this.pollInProgress) {
      return;
    }
    this.pollInProgress = true;
    try {
      let attempt = 0;
      while (!(await this.probeHealth())) {
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
      window.location.reload();
    } finally {
      this.pollInProgress = false;
    }
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
