// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Waits until the schedule has loaded every employee and shift chunk (no pending debounced read, no
 * pending initial response, no chunk in flight, nothing left to load), so a wizard run does not send a
 * partial selection. Resolves "stalled" when an initial request failed or auto-loading stopped after an
 * error with data still missing, and "timeout" after SCHEDULE_LOAD_TIMEOUT_MS.
 * @param timeoutMs - Maximum time to wait before resolving "timeout"
 */

import { Injectable, inject } from '@angular/core';
import { DataManagementScheduleService } from './data-management-schedule.service';
import {
  SCHEDULE_LOAD_OUTCOME,
  SCHEDULE_LOAD_POLL_INTERVAL_MS,
  SCHEDULE_LOAD_TIMEOUT_MS,
} from 'src/app/domain/constants/schedule-load-completion.constants';
import { ScheduleLoadOutcome } from 'src/app/domain/models/schedule/schedule-load-outcome.type';

@Injectable({ providedIn: 'root' })
export class ScheduleLoadCompletionService {
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);

  awaitFullyLoaded(timeoutMs: number = SCHEDULE_LOAD_TIMEOUT_MS): Promise<ScheduleLoadOutcome> {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve) => {
      const check = (): void => {
        if (this.dataManagementSchedule.isScheduleFullyLoaded) {
          resolve(SCHEDULE_LOAD_OUTCOME.Complete);
          return;
        }
        if (this.dataManagementSchedule.isScheduleLoadStalled) {
          resolve(SCHEDULE_LOAD_OUTCOME.Stalled);
          return;
        }
        if (Date.now() >= deadline) {
          resolve(SCHEDULE_LOAD_OUTCOME.Timeout);
          return;
        }
        setTimeout(check, SCHEDULE_LOAD_POLL_INTERVAL_MS);
      };
      check();
    });
  }
}
