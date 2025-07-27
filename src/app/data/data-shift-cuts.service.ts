import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  dateWithLocalTimeCorrection,
  isNgbDateStructOk,
  isOwnTimeStructOk,
  transformNgbDateStructToDate,
  transformOwnTimeToNumber,
  transformOwnTimeToString,
} from '../helpers/format-helper';
import { IShift } from '../core/shift-class';

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

  addCuts(cuts: IShift[]) {
    const processedCuts = cuts.map(cut => {
      const processedCut = { ...cut };
      // WICHTIG: ID, macroId, lft, rgt, parentId NICHT löschen für korrekte Hierarchie
      delete processedCut.addressName;
      this.setCorrectDate(processedCut);
      this.setCorrectTime(processedCut);
      return processedCut;
    });

    return this.httpClient
      .post<IShift[]>(`${environment.baseUrl}Shifts/Cuts`, processedCuts)
      .pipe(retry(3));
  }

  updateCuts(cuts: IShift[]) {
    const processedCuts = cuts.map(cut => {
      const processedCut = { ...cut };
      delete processedCut.addressName;
      this.setCorrectDate(processedCut);
      this.setCorrectTime(processedCut);
      return processedCut;
    });

    return this.httpClient
      .put<IShift[]>(`${environment.baseUrl}Shifts/Cuts`, processedCuts)
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
  }

  private setCorrectTime(value: IShift) {
    const nullTime = '00:00:00';
    value.afterShift = nullTime;
    value.beforeShift = nullTime;
    value.endShift = nullTime;
    value.startShift = nullTime;
    value.travelTimeAfter = nullTime;
    value.travelTimeBefore = nullTime;
    value.briefingTime = nullTime;
    value.debriefingTime = nullTime;

    if (
      value!.internalStartShift &&
      isOwnTimeStructOk(value!.internalStartShift)
    ) {
      value.startShift = transformOwnTimeToString(value!.internalStartShift);
    }

    if (value!.internalEndShift && isOwnTimeStructOk(value!.internalEndShift)) {
      value.endShift = transformOwnTimeToString(value!.internalEndShift);
    }

    if (
      value!.internalAfterShift &&
      isOwnTimeStructOk(value!.internalAfterShift)
    ) {
      value.afterShift = transformOwnTimeToString(value!.internalAfterShift);
    }

    if (
      value!.internalBeforeShift &&
      isOwnTimeStructOk(value!.internalBeforeShift)
    ) {
      value.beforeShift = transformOwnTimeToString(value!.internalBeforeShift);
    }

    if (
      value!.internalTravelTimeAfter &&
      isOwnTimeStructOk(value!.internalTravelTimeAfter)
    ) {
      value.travelTimeAfter = transformOwnTimeToString(
        value!.internalTravelTimeAfter
      );
    }

    if (
      value!.internalTravelTimeBefore &&
      isOwnTimeStructOk(value!.internalTravelTimeBefore)
    ) {
      value.travelTimeBefore = transformOwnTimeToString(
        value!.internalTravelTimeBefore
      );
    }

    if (value!.internalWorkTime && isOwnTimeStructOk(value!.internalWorkTime)) {
      value.workTime = 0;
      value.workTime = transformOwnTimeToNumber(value!.internalWorkTime);
    }

    if (
      value!.internalBriefingTime &&
      isOwnTimeStructOk(value!.internalBriefingTime)
    ) {
      value.briefingTime = transformOwnTimeToString(
        value!.internalBriefingTime
      );
    }

    if (
      value!.internalDebriefingTime &&
      isOwnTimeStructOk(value!.internalDebriefingTime)
    ) {
      value.debriefingTime = transformOwnTimeToString(
        value!.internalDebriefingTime
      );
    }
  }
}