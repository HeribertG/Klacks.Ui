// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells, without a session, whether a fresh installation still waits for its own admin account, so the app can open
 * the setup page instead of the login page. Asks the backend only until it has answered "no" once (or the setup was
 * completed here): a claimed installation never becomes claimable again, so later visits of the login page cost no
 * request. A failed request counts as "no" and is not remembered, because the login page must stay usable when the
 * probe fails and the next visit should ask again.
 * @param dataSetupService - Anonymous first-start probe of the backend
 */
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';

@Injectable({ providedIn: 'root' })
export class FirstStartSetupStatusService {
  private readonly dataSetupService = inject(DataSetupService);
  private settled = false;

  async isPending(): Promise<boolean> {
    if (this.settled) {
      return false;
    }

    try {
      const status = await firstValueFrom(this.dataSetupService.getFirstStartStatus());
      const pending = status?.requiresOwnAdmin === true;
      this.settled = !pending;
      return pending;
    } catch {
      return false;
    }
  }

  markCompleted(): void {
    this.settled = true;
  }
}
