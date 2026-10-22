// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells an empty installation apart from a filtered-to-nothing list view: the installation counts as empty while it
 * has no order, no shift and no work along the order -> shift -> assignment chain (customers and groups do not count).
 */

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataScheduleSetupStateService } from 'src/app/infrastructure/api/assistant/data-schedule-setup-state.service';

@Injectable({ providedIn: 'root' })
export class InstallationSetupStateService {
  private readonly dataScheduleSetupStateService = inject(DataScheduleSetupStateService);

  isInstallationEmpty(): Observable<boolean> {
    return this.dataScheduleSetupStateService
      .getState()
      .pipe(map((state) => !(state.hasOrders || state.hasShifts || state.hasWork)));
  }
}
