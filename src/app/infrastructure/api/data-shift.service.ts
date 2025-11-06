import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';

import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';
import { isNgbDateStructOk, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { isOwnTimeStructOk, transformOwnTimeToString } from 'src/app/domain/helpers/own-time.helper';
import { ITruncatedShift, ShiftFilter } from 'src/app/domain/models/shift-data-class';
import { IShift } from 'src/app/domain/models/shift-class';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

@Injectable({
  providedIn: 'root',
})
export class DataShiftService {
  private httpClient = inject(HttpClient);
  private workTimeCalculationService = inject(WorkTimeCalculationService);

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
    this.setCorrectDate(value);
    this.setCorrectTime(value);
    return this.httpClient
      .put<IShift>(`${environment.baseUrl}Shifts/`, value)
      .pipe(retry(3));
  }

  addShift(value: IShift) {
    delete value.id;
    delete value.addressName;
    this.setCorrectDate(value);
    this.setCorrectTime(value);
    return this.httpClient
      .post<IShift>(`${environment.baseUrl}Shifts/`, value)
      .pipe(retry(3));
  }

  deleteShift(id: string) {
    return this.httpClient
      .delete<IShift>(`${environment.baseUrl}Shifts/` + id)
      .pipe(retry(3));
  }

  private setCorrectDate(value: IShift) {
    if (isNgbDateStructOk(value!.internalFromDate)) {
      value.fromDate = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalFromDate)
      )!;
    } else {
      value.fromDate = new Date();
    }
    value.fromDate = dateWithLocalTimeCorrection(value.fromDate)!;

    if (isNgbDateStructOk(value!.internalUntilDate)) {
      value.untilDate = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalUntilDate)
      )!;
      value.untilDate = dateWithLocalTimeCorrection(value.untilDate)!;
    } else {
      value.untilDate = undefined;
    }

    if (isNgbDateStructOk(value!.internalUntilDate)) {
      value.untilDate = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalUntilDate)
      )!;
      value.untilDate = dateWithLocalTimeCorrection(value.untilDate)!;
    } else {
      value.untilDate = undefined;
    }
  }

  private setCorrectTime(value: IShift) {
    const nullTime = '00:00:00';

    if (
      value!.internalStartShift &&
      isOwnTimeStructOk(value!.internalStartShift)
    ) {
      value.startShift = transformOwnTimeToString(value!.internalStartShift);
    } else if (!value.startShift) {
      value.startShift = nullTime;
    }

    if (value!.internalEndShift && isOwnTimeStructOk(value!.internalEndShift)) {
      value.endShift = transformOwnTimeToString(value!.internalEndShift);
    } else if (!value.endShift) {
      value.endShift = nullTime;
    }

    if (
      value!.internalAfterShift &&
      isOwnTimeStructOk(value!.internalAfterShift)
    ) {
      value.afterShift = transformOwnTimeToString(value!.internalAfterShift);
    } else if (!value.afterShift) {
      value.afterShift = nullTime;
    }

    if (
      value!.internalBeforeShift &&
      isOwnTimeStructOk(value!.internalBeforeShift)
    ) {
      value.beforeShift = transformOwnTimeToString(value!.internalBeforeShift);
    } else if (!value.beforeShift) {
      value.beforeShift = nullTime;
    }

    if (
      value!.internalTravelTimeAfter &&
      isOwnTimeStructOk(value!.internalTravelTimeAfter)
    ) {
      value.travelTimeAfter = transformOwnTimeToString(
        value!.internalTravelTimeAfter
      );
    } else if (!value.travelTimeAfter) {
      value.travelTimeAfter = nullTime;
    }

    if (
      value!.internalTravelTimeBefore &&
      isOwnTimeStructOk(value!.internalTravelTimeBefore)
    ) {
      value.travelTimeBefore = transformOwnTimeToString(
        value!.internalTravelTimeBefore
      );
    } else if (!value.travelTimeBefore) {
      value.travelTimeBefore = nullTime;
    }

    value.workTime = this.workTimeCalculationService.calculateWorkTimeWithFallback(
      value!.internalStartShift,
      value!.internalEndShift,
      value!.internalWorkTime
    );

    if (
      value!.internalBriefingTime &&
      isOwnTimeStructOk(value!.internalBriefingTime)
    ) {
      value.briefingTime = transformOwnTimeToString(
        value!.internalBriefingTime
      );
    } else if (!value.briefingTime) {
      value.briefingTime = nullTime;
    }

    if (
      value!.internalDebriefingTime &&
      isOwnTimeStructOk(value!.internalDebriefingTime)
    ) {
      value.debriefingTime = transformOwnTimeToString(
        value!.internalDebriefingTime
      );
    } else if (!value.debriefingTime) {
      value.debriefingTime = nullTime;
    }
  }
}
