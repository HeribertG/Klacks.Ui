// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  IPeriodHours,
  IPeriodHoursRequest,
  IWorkScheduleFilter,
  IWorkScheduleResponse,
} from 'src/app/domain/models/schedule/work-schedule-class';

@Injectable({
  providedIn: 'root',
})
export class DataWorkScheduleService {
  private httpClient = inject(HttpClient);

  getWorkSchedule(filter: IWorkScheduleFilter) {
    return this.httpClient
      .post<IWorkScheduleResponse>(`${environment.baseUrl}Works/Schedule`, filter)
      .pipe(retry(3));
  }

  getPeriodHours(request: IPeriodHoursRequest) {
    return this.httpClient
      .post<Record<string, IPeriodHours>>(`${environment.baseUrl}Works/PeriodHours`, request)
      .pipe(retry(2));
  }

  recalculatePeriodHours(startDate: string, endDate: string, selectedGroup?: string) {
    return this.httpClient
      .post<boolean>(`${environment.baseUrl}Works/RecalculatePeriodHours`, {
        startDate,
        endDate,
        selectedGroup: selectedGroup || null,
      });
  }
}
