// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Starts the recalculation of the period hours for the group selected in the schedule filter. The thorough
 * variant also sends the token of the open scenario so its completion notification can be matched. Both answer how many
 * frozen (sealed and exported) client periods were left unchanged; the optional admin override includes them.
 * recalculateAllUnsealed (admin) queues the thorough run over every unsealed entry of the real plan, whatever its date,
 * and answers whether the queue accepted it.
 * @param startDate - First day of the period to recalculate
 * @param endDate - Last day of the period to recalculate
 * @param frozenOverride - Admin override with its mandatory reason; omitted for the normal run
 */
import { inject, Injectable } from '@angular/core';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import { IFrozenPeriodOverride } from 'src/app/domain/models/schedule/frozen-period-override.interface';
import { IPeriodHoursRecalculationResult } from 'src/app/domain/models/schedule/period-hours-recalculation-result.interface';
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

  recalculate(
    startDate: Date,
    endDate: Date,
    frozenOverride?: IFrozenPeriodOverride,
  ): Promise<IPeriodHoursRecalculationResult> {
    return new Promise<IPeriodHoursRecalculationResult>((resolve, reject) => {
      this.dataWorkScheduleService
        .recalculatePeriodHours(
          formatDateOnly(startDate),
          formatDateOnly(endDate),
          this.dataManagementSchedule.workFilter.selectedGroup,
          frozenOverride,
        )
        .subscribe({ next: resolve, error: reject });
    });
  }

  recalculateThorough(
    startDate: Date,
    endDate: Date,
    frozenOverride?: IFrozenPeriodOverride,
  ): Promise<IPeriodHoursRecalculationResult> {
    return new Promise<IPeriodHoursRecalculationResult>((resolve, reject) => {
      this.dataWorkScheduleService
        .recalculatePeriodHoursThorough(
          formatDateOnly(startDate),
          formatDateOnly(endDate),
          this.dataManagementSchedule.workFilter.selectedGroup,
          this.analyseScenarioService.activeToken(),
          frozenOverride,
        )
        .subscribe({ next: resolve, error: reject });
    });
  }

  recalculateAllUnsealed(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.dataWorkScheduleService.recalculateAllUnsealed().subscribe({
        next: (result) => resolve(result.queued),
        error: reject,
      });
    });
  }
}
