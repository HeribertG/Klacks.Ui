// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holds the playground state of this browser: whether the public playground's daily token limit is active and the
 * signed device token that identifies the browser to the server. The token is persisted in local storage only while
 * the limit is active; on every other installation nothing is written and no header is sent. A stored or received
 * token of implausible shape is discarded, so the next status request fetches a fresh one.
 * @param limitActive - True once the backend reported the playground limit for this instance
 */
import { Injectable, inject, signal } from '@angular/core';
import { PLAYGROUND_DEVICE_HEADER } from 'src/app/domain/constants/playground.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { isPlausiblePlaygroundDeviceToken } from 'src/app/domain/helpers/playground-token-limit.helper';
import { PlaygroundStatus } from 'src/app/domain/models/playground/playground-status.interface';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

@Injectable({ providedIn: 'root' })
export class PlaygroundDeviceService {
  private readonly storage = inject(LocalStorageService);
  private readonly limitActiveSignal = signal(false);
  private token: string | null = null;

  readonly limitActive = this.limitActiveSignal.asReadonly();

  storedToken(): string | null {
    try {
      const stored = this.storage.get(StorageKeys.PLAYGROUND_DEVICE_TOKEN);
      if (isPlausiblePlaygroundDeviceToken(stored)) {
        return stored;
      }
      if (stored !== null) {
        this.storage.remove(StorageKeys.PLAYGROUND_DEVICE_TOKEN);
      }
      return null;
    } catch {
      return null;
    }
  }

  applyStatus(status: PlaygroundStatus): void {
    if (!status.limitActive) {
      this.limitActiveSignal.set(false);
      this.token = null;
      return;
    }

    if (isPlausiblePlaygroundDeviceToken(status.deviceToken)) {
      this.token = status.deviceToken;
      this.persist(status.deviceToken);
    } else {
      this.token = this.token ?? this.storedToken();
    }
    this.limitActiveSignal.set(true);
  }

  deviceToken(): string | null {
    return this.limitActiveSignal() ? this.token : null;
  }

  deviceHeaders(): Record<string, string> {
    const token = this.deviceToken();
    return token ? { [PLAYGROUND_DEVICE_HEADER]: token } : {};
  }

  private persist(token: string): void {
    try {
      this.storage.set(StorageKeys.PLAYGROUND_DEVICE_TOKEN, token);
    } catch {
      return;
    }
  }
}
