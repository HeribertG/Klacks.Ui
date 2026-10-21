// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Starts the recalculation of the period hours for the group selected in the schedule filter. The thorough
 * variant also sends the token of the open scenario so its completion notification can be matched.
 * @param startDate - First day of the period to recalculate
 * @param endDate - Last day of the period to recalculate
 */
import { inject, Injectable } from '@angular/core';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { AnalyseScenarioService } from './analyse-scenario.service';

@Injectable({
  providedIn: 'root',
})
export class PeriodHoursRecalculationService {
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataWorkScheduleService = inject(DataWorkScheduleService);
  private analyseScenarioService = inject(AnalyseScenarioService);

  recalculate(startDate: Date, endDate: Date): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.dataWorkScheduleService
        .recalculatePeriodHours(
          formatDateOnly(startDate),
          formatDateOnly(endDate),
          this.dataManagementSchedule.workFilter.selectedGroup,
        )
        .subscribe({ next: resolve, error: reject });
    });
  }

  recalculateThorough(startDate: Date, endDate: Date): Promise<{ queued: boolean }> {
    return new Promise<{ queued: boolean }>((resolve, reject) => {
      this.dataWorkScheduleService
        .recalculatePeriodHoursThorough(
          formatDateOnly(startDate),
          formatDateOnly(endDate),
          this.dataManagementSchedule.workFilter.selectedGroup,
          this.analyseScenarioService.activeToken(),
        )
        .subscribe({ next: resolve, error: reject });
    });
  }
}
