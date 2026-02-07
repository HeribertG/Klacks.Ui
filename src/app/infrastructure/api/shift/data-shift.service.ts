import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';

import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';
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


  updateShift(value: IShift) {
    delete value.addressName;
    this.ensureDateCorrection(value);
    this.ensureTimeDefaults(value);
    return this.httpClient
      .put<IShift>(`${environment.baseUrl}Shifts/`, value)
      .pipe(retry(3));
  }

  addShift(value: IShift) {
    delete value.id;
    delete value.addressName;
    this.ensureDateCorrection(value);
    this.ensureTimeDefaults(value);
    return this.httpClient
      .post<IShift>(`${environment.baseUrl}Shifts/`, value)
      .pipe(retry(3));
  }

  deleteShift(id: string) {
    return this.httpClient
      .delete<IShift>(`${environment.baseUrl}Shifts/` + id)
      .pipe(retry(3));
  }

  private ensureDateCorrection(value: IShift) {
    if (!value.fromDate) {
      value.fromDate = new Date();
    }
    value.fromDate = dateWithLocalTimeCorrection(value.fromDate)!;

    if (value.untilDate) {
      value.untilDate = dateWithLocalTimeCorrection(value.untilDate)!;
    }
  }

  private ensureTimeDefaults(value: IShift) {
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

    if (!value.briefingTime) {
      value.briefingTime = nullTime;
    }

    if (!value.debriefingTime) {
      value.debriefingTime = nullTime;
    }
  }
}
