// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decides whether the signed-in user is the seeded admin whose account still has to be replaced by an own admin.
 * Only the seeded admin triggers a status read; a failed read counts as "not required" because
 * SetupRequiredInterceptor still catches the block reactively.
 */

import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SEED_ADMIN_USER_ID } from 'src/app/domain/constants/setup.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

@Injectable({ providedIn: 'root' })
export class OwnAdminSetupStatusService {
  private readonly dataSetupService = inject(DataSetupService);
  private readonly localStorageService = inject(LocalStorageService);

  async isOwnAdminSetupRequired(): Promise<boolean> {
    if (this.localStorageService.get(StorageKeys.TOKEN_USERID) !== SEED_ADMIN_USER_ID) {
      return false;
    }

    try {
      const status = await firstValueFrom(this.dataSetupService.getStatus());
      return !!status.requiresOwnAdmin;
    } catch {
      return false;
    }
  }
}
