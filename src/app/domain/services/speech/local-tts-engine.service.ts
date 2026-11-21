// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared state and actions of the local voice (Supertonic 3 in Klacks.Stt): status, the licence text and the install
 * request with licence consent. One polling loop runs while an installation is pending and at least one consumer
 * (settings card) is attached. A failed status request keeps the last known status; after
 * LOCAL_TTS_MAX_CONSECUTIVE_FAILURES failures in a row the poll stops until a manual refresh succeeds. Responses are
 * applied latest-request-wins. The service never switches the speech output provider itself (owner decision).
 * @param status - Latest status from the Api, null until loaded or when it could not be loaded
 * @param license - Licence text and version for the consent dialog, null until loaded
 * @param licenseLoadFailed - True when the last attempt to load the licence text failed
 * @param busy - True while the install request is being sent
 * @param installErrorKey - Translation key of the last refused install request, empty when none
 * @param pollingSuspended - True once the status could not be loaded repeatedly; the shown status may be stale
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpStatusCode } from '@angular/common/http';
import { DataLocalTtsService } from 'src/app/infrastructure/api/assistant/data-local-tts.service';
import {
  LOCAL_TTS_KEYS,
  LOCAL_TTS_MAX_CONSECUTIVE_FAILURES,
  LOCAL_TTS_POLL_INTERVAL_MS,
} from 'src/app/domain/constants/local-tts.constants';
import { LocalTtsStatus } from 'src/app/domain/models/assistant/local-tts-status.interface';
import { LocalTtsLicense } from 'src/app/domain/models/assistant/local-tts-license.interface';

@Injectable({ providedIn: 'root' })
export class LocalTtsEngineService {
  private readonly api = inject(DataLocalTtsService);

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private consumers = 0;
  private requestSequence = 0;
  private consecutiveFailures = 0;

  public readonly status = signal<LocalTtsStatus | null>(null);
  public readonly license = signal<LocalTtsLicense | null>(null);
  public readonly licenseLoadFailed = signal(false);
  public readonly busy = signal(false);
  public readonly installErrorKey = signal('');
  public readonly pollingSuspended = signal(false);

  public readonly isInstalled = computed(() => !!this.status()?.installed);
  public readonly isPending = computed(() => !!this.status()?.pending);
  public readonly lastError = computed(() => {
    const s = this.status();
    return s && !s.pending && !s.installed ? s.lastError : null;
  });
  public readonly statusUnavailable = computed(() => !this.status() || this.pollingSuspended());
  public readonly canInstall = computed(() => {
    const s = this.status();
    return !!s && !s.installed && !s.pending && !this.busy();
  });

  public async attach(): Promise<void> {
    this.consumers++;
    await this.refresh();
  }

  public detach(): void {
    this.consumers = Math.max(0, this.consumers - 1);
    if (this.consumers === 0) {
      this.stopPolling();
    }
  }

  public async refresh(): Promise<void> {
    this.consecutiveFailures = 0;
    await this.loadStatus();
  }

  public async loadLicense(): Promise<void> {
    this.licenseLoadFailed.set(false);
    const license = await this.api.getLicense();
    this.license.set(license);
    this.licenseLoadFailed.set(!license);
  }

  /**
   * Sends the install request with the consent the administrator just gave in the dialog.
   * @param licenseVersion - Version of the licence text the administrator read (from loadLicense, never hard-coded)
   * @returns True when the installation was queued
   */
  public async install(licenseVersion: string): Promise<boolean> {
    this.busy.set(true);
    this.installErrorKey.set('');
    try {
      const response = await this.api.install({ acceptLicense: true, licenseVersion });
      const queued = response.httpStatus === HttpStatusCode.Accepted;
      this.installErrorKey.set(queued ? '' : this.errorKeyFor(response.httpStatus));
      await this.refresh();
      return queued;
    } finally {
      this.busy.set(false);
    }
  }

  private errorKeyFor(httpStatus: number): string {
    if (httpStatus === HttpStatusCode.BadRequest) {
      return LOCAL_TTS_KEYS.INSTALL_INVALID_CONSENT;
    }
    if (httpStatus === HttpStatusCode.Conflict) {
      return LOCAL_TTS_KEYS.INSTALL_CONFLICT;
    }
    return LOCAL_TTS_KEYS.INSTALL_FAILED;
  }

  private async loadStatus(): Promise<void> {
    const sequence = ++this.requestSequence;
    const status = await this.api.getStatus();
    if (sequence !== this.requestSequence) {
      return;
    }
    if (!status) {
      this.registerFailure();
      return;
    }
    this.consecutiveFailures = 0;
    this.pollingSuspended.set(false);
    this.status.set(status);
    this.syncPolling(status);
  }

  private registerFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= LOCAL_TTS_MAX_CONSECUTIVE_FAILURES) {
      this.pollingSuspended.set(true);
      this.stopPolling();
    }
  }

  private syncPolling(status: LocalTtsStatus): void {
    if (this.consumers > 0 && status.pending) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    if (this.pollHandle !== null) {
      return;
    }
    this.pollHandle = setInterval(() => void this.loadStatus(), LOCAL_TTS_POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
