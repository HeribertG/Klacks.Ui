// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Proactively checks - after login and again on app startup for an existing session -
 * whether the seeded admin account still needs to be replaced with a real admin account,
 * and forces a redirect to the setup page before the seeded admin can reach anything else.
 * This is the proactive counterpart to SetupRequiredInterceptor, which only reacts once the
 * backend has already refused a request; this check saves that first failed request whenever
 * the status can be read in time. Non-seed-admin users never trigger a status call.
 */
import { inject, Injectable } from '@angular/core';
import { OwnAdminSetupStatusService } from 'src/app/domain/services/setup/own-admin-setup-status.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Injectable({ providedIn: 'root' })
export class SetupGateService {
  private readonly ownAdminSetupStatus = inject(OwnAdminSetupStatusService);
  private readonly navigationService = inject(NavigationService);

  /** Returns true when the caller was redirected to the setup page, so it can skip its own navigation. */
  async checkAndRedirect(): Promise<boolean> {
    if (!(await this.ownAdminSetupStatus.isOwnAdminSetupRequired())) {
      return false;
    }

    this.navigationService.navigateToSetup();
    return true;
  }
}
