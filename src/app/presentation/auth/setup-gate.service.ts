// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Proactively checks - after login and again on app startup for an existing session -
 * whether the seeded admin account still needs to be replaced with a real admin account,
 * and forces a redirect to the setup page before the seeded admin can reach anything else.
 * This is the proactive counterpart to SetupRequiredInterceptor, which only reacts once the
 * backend has already refused a request; this check saves that first failed request whenever
 * the status can be read in time. Non-seed-admin users never trigger a status call.
 */
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SEED_ADMIN_USER_ID } from 'src/app/domain/constants/setup.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Injectable({ providedIn: 'root' })
export class SetupGateService {
  private readonly dataSetupService = inject(DataSetupService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly navigationService = inject(NavigationService);

  /** Returns true when the caller was redirected to the setup page, so it can skip its own navigation. */
  async checkAndRedirect(): Promise<boolean> {
    if (this.localStorageService.get(StorageKeys.TOKEN_USERID) !== SEED_ADMIN_USER_ID) {
      return false;
    }

    try {
      const status = await firstValueFrom(this.dataSetupService.getStatus());
      if (status.requiresOwnAdmin) {
        this.navigationService.navigateToSetup();
        return true;
      }
      return false;
    } catch {
      // Best-effort proactive check - SetupRequiredInterceptor still catches the block reactively.
      return false;
    }
  }
}
