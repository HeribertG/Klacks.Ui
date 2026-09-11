// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  IShiftScheduleFilter,
  IShiftScheduleResponse,
} from 'src/app/domain/models/schedule/shift-schedule-class';
import { toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';

@Injectable({
  providedIn: 'root',
})
export class DataShiftScheduleService {
  private httpClient = inject(HttpClient);

  getShiftSchedule(filter: IShiftScheduleFilter) {
    return this.httpClient
      .post<IShiftScheduleResponse>(`${environment.baseUrl}Shifts/Schedule`, this.toWirePayload(filter))
      .pipe(retry(1), timeout(30000));
  }

  private toWirePayload(filter: IShiftScheduleFilter) {
    return {
      ...filter,
      holidayDates: filter.holidayDates?.map((d) => toCalendarDateWire(d)),
    };
  }
}
