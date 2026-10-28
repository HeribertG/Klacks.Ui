// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Usage rules of the public playground's AI features: the one-time confirmation of the privacy notice and the
 * per-prompt character limit. Everything is inert while the playground limit is inactive - nothing is read as a
 * restriction and nothing is written to storage. A missing or failing storage keeps the confirmation in memory
 * only, so the notice is asked again on the next page start.
 * @param statusResolved - False only while the playground status request is in flight; sending and voice start wait for it.
 * A status that is still unknown after a network, server or timeout failure is requested once more by the first wait
 * @param acknowledged - True once the visitor confirmed the notice in this browser (or in this page session)
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  PLAYGROUND_MAX_PROMPT_CHARS,
  PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE,
} from 'src/app/domain/constants/playground.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundDeviceService } from './playground-device.service';
import { PlaygroundStatusGateService } from './playground-status-gate.service';

@Injectable({ providedIn: 'root' })
export class PlaygroundPromptGateService {
  private readonly device = inject(PlaygroundDeviceService);
  private readonly storage = inject(LocalStorageService);
  private readonly statusGate = inject(PlaygroundStatusGateService);
  private readonly acknowledged = signal(this.readAcknowledged());

  readonly limitActive = this.device.limitActive;
  readonly statusResolved = this.statusGate.statusResolved;
  readonly confirmationPending = computed(() => this.device.limitActive() && !this.acknowledged());
  readonly maxPromptChars = computed(() => (this.device.limitActive() ? PLAYGROUND_MAX_PROMPT_CHARS : null));

  waitForStatus(): Promise<boolean> {
    this.statusGate.recheckIfUnknown();
    return this.statusGate.waitUntilResolved();
  }

  acknowledge(): void {
    if (!this.device.limitActive()) {
      return;
    }
    this.acknowledged.set(true);
    try {
      this.storage.set(StorageKeys.PLAYGROUND_NOTICE_ACKNOWLEDGED, PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE);
    } catch {
      return;
    }
  }

  exceedsLimit(text: string): boolean {
    return this.exceedsLength(text.length);
  }

  exceedsLength(length: number): boolean {
    const max = this.maxPromptChars();
    return max !== null && length > max;
  }

  private readAcknowledged(): boolean {
    try {
      return this.storage.get(StorageKeys.PLAYGROUND_NOTICE_ACKNOWLEDGED) === PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE;
    } catch {
      return false;
    }
  }
}
