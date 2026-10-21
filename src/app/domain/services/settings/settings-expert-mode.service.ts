// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers per browser whether the settings page shows the expert cards, stored as the text 'true' or 'false'.
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

const EXPERT_MODE_ENABLED_VALUE = 'true';

@Injectable({ providedIn: 'root' })
export class SettingsExpertModeService {
  private localStorageService = inject(LocalStorageService);

  isEnabled(): boolean {
    return this.localStorageService.get(StorageKeys.SETTINGS_EXPERT_MODE) === EXPERT_MODE_ENABLED_VALUE;
  }

  setEnabled(enabled: boolean): void {
    this.localStorageService.set(StorageKeys.SETTINGS_EXPERT_MODE, String(enabled));
  }
}
