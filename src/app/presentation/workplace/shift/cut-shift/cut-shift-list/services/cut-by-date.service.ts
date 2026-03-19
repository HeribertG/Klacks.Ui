// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service fuer die Cut-by-Date Strategie: Analyse der Datumsgrenzen eines Shifts.
 * @param shift - Der zu analysierende Shift mit fromDate/untilDate
 */
import { Injectable, inject } from '@angular/core';
import { NgbCalendar, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { CutDateParams } from './cut-parameter-state';

@Injectable({
  providedIn: 'root',
})
export class CutByDateService {
  private calendar = inject(NgbCalendar);

  analyzeCutByDate(shift: Shift): CutDateParams {
    const result: CutDateParams = {
      cutDate: null,
      resetDate: null,
      minDate: undefined,
      maxDate: undefined,
    };

    if (!shift.fromDate && !shift.untilDate) {
      return result;
    }

    if (shift.fromDate) {
      const ngbFromDate = transformDateToNgbDateStruct(shift.fromDate);
      if (ngbFromDate) {
        const fromDate = NgbDate.from(ngbFromDate);
        if (fromDate) {
          result.minDate = this.calendar.getNext(fromDate, 'd', 1);
          result.cutDate = result.minDate;
        }
      }
    }

    if (shift.untilDate) {
      const ngbUntilDate = transformDateToNgbDateStruct(shift.untilDate);
      if (ngbUntilDate) {
        const untilDate = NgbDate.from(ngbUntilDate);
        if (untilDate) {
          result.maxDate = untilDate;
        }
      }
    } else if (result.minDate) {
      result.maxDate = this.calendar.getNext(result.minDate, 'y', 1);
    }

    return result;
  }
}
