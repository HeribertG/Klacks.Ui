// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, retry } from 'rxjs';
import { environment } from 'src/environments/environment';

import { companyToday, toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';
import { toShiftGroupsWire } from './shift-groups-wire.mapper';
import { ITruncatedShift, ShiftFilter } from 'src/app/domain/models/shift/shift-data-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';

@Injectable({
  providedIn: 'root',
})
export class DataShiftService {
  private httpClient = inject(HttpClient);

  readShiftList(filter: ShiftFilter) {
    return this.httpClient
      .post<ITruncatedShift>(
        `${environment.baseUrl}Shifts/GetSimpleList/`,
        filter
      )
      .pipe();
  }

  getShift(id: string) {
    return this.httpClient
      .get<IShift>(`${environment.baseUrl}Shifts/` + id)
      .pipe(retry(3));
  }

  getShiftsByIds(ids: string[]) {
    return this.httpClient.post<IShift[]>(
      `${environment.baseUrl}Shifts/ByIds`,
      ids,
    );
  }


  updateShift(value: IShift) {
    return defer(() => {
      const { addressName: _addressName, ...rest } = value;
      return this.httpClient
        .put<IShift>(`${environment.baseUrl}Shifts/`, this.toWirePayload(rest))
        .pipe(retry(3));
    });
  }

  addShift(value: IShift) {
    return defer(() => {
      const { addressName: _addressName, ...rest } = value;
      const { id: _id, ...payload } = this.toWirePayload(rest);
      return this.httpClient
        .post<IShift>(`${environment.baseUrl}Shifts/`, payload)
        .pipe(retry(3));
    });
  }

  deleteShift(id: string) {
    return this.httpClient
      .delete<IShift>(`${environment.baseUrl}Shifts/` + id)
      .pipe(retry(3));
  }

  private toWirePayload(value: Omit<IShift, 'addressName'>) {
    const nullTime = '00:00:00';
    const fromDate = value.fromDate ?? companyToday();

    return {
      ...value,
      fromDate: toCalendarDateWire(fromDate),
      untilDate: value.untilDate ? toCalendarDateWire(value.untilDate) : value.untilDate,
      groups: toShiftGroupsWire(value.groups),
      startShift: value.startShift || nullTime,
      endShift: value.endShift || nullTime,
      afterShift: value.afterShift || nullTime,
      beforeShift: value.beforeShift || nullTime,
      travelTimeAfter: value.travelTimeAfter || nullTime,
      travelTimeBefore: value.travelTimeBefore || nullTime,
      briefingTime: value.briefingTime || nullTime,
      debriefingTime: value.debriefingTime || nullTime,
    };
  }
}
