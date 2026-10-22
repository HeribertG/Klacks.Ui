// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Loads everything the period-closing overview shows for one billing period in parallel: the sealed-day summary, the
 * open issues, the export log and the number of still unstaffed shift positions (need minus engaged, summed over the
 * shifts of the period, capped at SHIFT_LOAD_LIMIT shifts). A failed export-log read counts as "no exports"; any other
 * failure propagates to the caller.
 * @param period - Billing period; its own start/end and group select summary and issues
 * @param bounds - Calendar range used for the shift schedule and the export log
 */

import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExportLog } from 'src/app/domain/models/period-closing/export-log';
import { PeriodBounds } from 'src/app/domain/models/period-closing/period-bounds';
import { PeriodClosingOverview } from 'src/app/domain/models/period-closing/period-closing-overview';
import { UsedPeriod } from 'src/app/domain/models/period-closing/used-period';
import { ShiftScheduleFilter } from 'src/app/domain/models/schedule/shift-schedule-filter-class';
import { IShiftScheduleFilter } from 'src/app/domain/models/schedule/shift-schedule-filter.interface';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule.interface';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';

const SHIFT_LOAD_LIMIT = 10000;

@Injectable({ providedIn: 'root' })
export class PeriodClosingOverviewService {
  private dataPeriodClosingService = inject(DataPeriodClosingService);
  private dataShiftScheduleService = inject(DataShiftScheduleService);

  loadOverview(period: UsedPeriod, bounds: PeriodBounds): Observable<PeriodClosingOverview> {
    return forkJoin({
      summary: this.dataPeriodClosingService.getSealedPeriods(period.startDate, period.endDate, period.groupId),
      issues: this.dataPeriodClosingService.getPeriodIssues(period.startDate, period.endDate, period.groupId),
      shifts: this.dataShiftScheduleService.getShiftSchedule(this.buildShiftFilter(period, bounds)),
      exportLogs: this.dataPeriodClosingService
        .getExportLog(bounds.start, bounds.end)
        .pipe(catchError(() => of([] as ExportLog[]))),
    }).pipe(
      map(({ summary, issues, shifts, exportLogs }) => ({
        summary,
        issues,
        exportLogs,
        unstaffedShiftCount: this.countUnstaffedPositions(shifts.shifts),
        unstaffedShiftTruncated: shifts.totalCount > shifts.shifts.length,
      }))
    );
  }

  private buildShiftFilter(period: UsedPeriod, bounds: PeriodBounds): IShiftScheduleFilter {
    const shiftFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
    shiftFilter.startDate = bounds.start;
    shiftFilter.endDate = bounds.end;
    shiftFilter.selectedGroup = period.groupId ?? undefined;
    shiftFilter.rowCount = SHIFT_LOAD_LIMIT;
    return shiftFilter;
  }

  private countUnstaffedPositions(shifts: IShiftSchedule[]): number {
    let total = 0;
    for (const shift of shifts) {
      const gap = shift.sumEmployees * shift.quantity - shift.engaged;
      if (gap > 0) total += gap;
    }
    return total;
  }
}
