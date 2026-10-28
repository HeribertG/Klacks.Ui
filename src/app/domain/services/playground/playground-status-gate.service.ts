// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tracks whether the playground status request is still in flight so that sending and voice start can wait for
 * it, and whether the last status request failed in a way that leaves the status unknown. Nothing is pending until
 * the status load begins, so contexts that never load a status (tests, plugins) are never delayed. Every load ends
 * the wait, whether it succeeded, failed or timed out. An unknown status is checked once more by the first send or
 * voice start; the status service registers the reload for that.
 * @param statusResolved - False only while a status load is in flight
 * @param statusUnknown - True while the last status request failed with a network, server or timeout error
 */
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlaygroundStatusGateService {
  private readonly pending = signal(false);
  private readonly unknown = signal(false);
  private pendingPromise: Promise<void> = Promise.resolve();
  private release: (() => void) | null = null;
  private waiting = false;
  private recheckHandler: (() => Promise<void>) | null = null;
  private rechecked = false;

  readonly statusResolved = computed(() => !this.pending());
  readonly statusUnknown = this.unknown.asReadonly();

  begin(): void {
    if (this.release) {
      return;
    }
    this.pendingPromise = new Promise<void>((resolve) => {
      this.release = resolve;
    });
    this.pending.set(true);
  }

  end(): void {
    this.release?.();
    this.release = null;
    this.pending.set(false);
  }

  markUnknown(unknown: boolean): void {
    this.unknown.set(unknown);
  }

  registerRecheck(handler: () => Promise<void>): void {
    this.recheckHandler = handler;
  }

  recheckIfUnknown(): void {
    if (!this.unknown() || this.rechecked || !this.recheckHandler) {
      return;
    }
    this.rechecked = true;
    void this.recheckHandler();
  }

  whenResolved(): Promise<void> {
    return this.pendingPromise;
  }

  async waitUntilResolved(): Promise<boolean> {
    if (this.statusResolved()) {
      return true;
    }
    if (this.waiting) {
      return false;
    }
    this.waiting = true;
    try {
      await this.pendingPromise;
      return true;
    } finally {
      this.waiting = false;
    }
  }
}
