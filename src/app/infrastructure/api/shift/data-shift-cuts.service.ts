// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';

import { parseCalendarDate, toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { CutOperation } from 'src/app/domain/models/shift/cut-operation';
import { calculateDurationInMinutes } from 'src/app/shared/helpers/time-format.helper';

export interface ResetDateRangeResponse {
  earliestResetDate: string;
  untilDate: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DataShiftCutsService {
  private httpClient = inject(HttpClient);

  getCutShiftList(id: string) {
    return this.httpClient
      .get<IShift[]>(`${environment.baseUrl}Shifts/CutList/` + id)
      .pipe(retry(3));
  }

  batchCuts(operations: CutOperation[]) {
    const processedOperations = operations.map((op) => {
      const processedData = { ...op.data };
      delete processedData.addressName;
      this.setCorrectDate(processedData);
      this.setCorrectTime(processedData);

      return {
        type: op.type,
        parentId: op.parentId,
        data: processedData,
      };
    });

    return this.httpClient
      .post<IShift[]>(`${environment.baseUrl}Shifts/Cuts/Batch`, {
        operations: processedOperations,
      })
      .pipe(retry(3));
  }

  resetCuts(originalId: string, newStartDate: Date) {
    return this.httpClient
      .post<IShift[]>(`${environment.baseUrl}Shifts/Cuts/Reset`, {
        originalId: originalId,
        newStartDate: toCalendarDateWire(newStartDate),
      })
      .pipe(retry(3));
  }

  getResetDateRange(originalId: string) {
    return this.httpClient
      .get<ResetDateRangeResponse>(
        `${environment.baseUrl}Shifts/Cuts/Reset/DateRange/${originalId}`
      )
      .pipe(retry(3));
  }

  private setCorrectDate(value: IShift) {
    const fromDate = parseCalendarDate(value.fromDate);
    if (fromDate) {
      value.fromDate = new Date(toCalendarDateWire(fromDate));
    }

    const untilDate = parseCalendarDate(value.untilDate);
    if (untilDate) {
      value.untilDate = new Date(toCalendarDateWire(untilDate));
    }
  }

  private setCorrectTime(value: IShift) {
    const nullTime = '00:00:00';

    if (!value.startShift) {
      value.startShift = nullTime;
    }

    if (!value.endShift) {
      value.endShift = nullTime;
    }

    if (!value.afterShift) {
      value.afterShift = nullTime;
    }

    if (!value.beforeShift) {
      value.beforeShift = nullTime;
    }

    if (!value.travelTimeAfter) {
      value.travelTimeAfter = nullTime;
    }

    if (!value.travelTimeBefore) {
      value.travelTimeBefore = nullTime;
    }

    if (value.workTime === undefined || value.workTime === null) {
      const durationMinutes = calculateDurationInMinutes(value.startShift, value.endShift);
      value.workTime = durationMinutes / 60;
    }

    if (!value.briefingTime) {
      value.briefingTime = nullTime;
    }

    if (!value.debriefingTime) {
      value.debriefingTime = nullTime;
    }
  }
}
