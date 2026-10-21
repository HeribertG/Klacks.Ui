// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, retry, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IShiftSchedulePartialFilter } from 'src/app/domain/models/schedule/shift-schedule-partial-filter.interface';
import { IShiftScheduleFilter } from 'src/app/domain/models/schedule/shift-schedule-filter.interface';
import { IShiftScheduleResponse } from 'src/app/domain/models/schedule/shift-schedule-response.interface';
import { toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';
import { retryTransientHttpErrors } from 'src/app/shared/helpers/http-retry.helper';

@Injectable({
  providedIn: 'root',
})
export class DataShiftScheduleService {
  private httpClient = inject(HttpClient);

  getShiftSchedule(filter: IShiftScheduleFilter) {
    return defer(() =>
      this.httpClient
        .post<IShiftScheduleResponse>(`${environment.baseUrl}Shifts/Schedule`, this.toWirePayload(filter))
        .pipe(retry(1), timeout(30000)),
    );
  }

  getShiftSchedulePartial(filter: IShiftSchedulePartialFilter) {
    return defer(() =>
      this.httpClient
        .post<IShiftScheduleResponse>(`${environment.baseUrl}Shifts/Schedule/Partial`, {
          shiftDatePairs: filter.shiftDatePairs.map((pair) => ({
            shiftId: pair.shiftId,
            date: toCalendarDateWire(pair.date),
          })),
          analyseToken: filter.analyseToken,
        })
        .pipe(retryTransientHttpErrors(1), timeout(30000)),
    );
  }

  private toWirePayload(filter: IShiftScheduleFilter) {
    return {
      ...filter,
      holidayDates: filter.holidayDates?.map((d) => toCalendarDateWire(d)),
    };
  }
}
