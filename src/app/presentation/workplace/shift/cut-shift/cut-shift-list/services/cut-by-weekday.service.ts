// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service fuer die Cut-by-Weekday Strategie: Analyse der aktiven Wochentage eines Shifts.
 * @param shift - Der zu analysierende Shift mit Wochentags-Flags
 */
import { Injectable } from '@angular/core';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { CutWeekdayParams } from './cut-parameter-state';

@Injectable({
  providedIn: 'root',
})
export class CutByWeekdayService {
  analyzeCutByWeekdays(shift: Shift): CutWeekdayParams {
    const result: CutWeekdayParams = {
      weekdays: {
        isMonday: false,
        isTuesday: false,
        isWednesday: false,
        isThursday: false,
        isFriday: false,
        isSaturday: false,
        isSunday: false,
      },
      isMondayEnabled: false,
      isTuesdayEnabled: false,
      isWednesdayEnabled: false,
      isThursdayEnabled: false,
      isFridayEnabled: false,
      isSaturdayEnabled: false,
      isSundayEnabled: false,
    };

    const weekdayFlags = [
      shift.isMonday,
      shift.isTuesday,
      shift.isWednesday,
      shift.isThursday,
      shift.isFriday,
      shift.isSaturday,
      shift.isSunday,
    ];

    const weekdayCount = weekdayFlags.filter(Boolean).length;

    if (weekdayCount < 2) {
      return result;
    }

    result.isMondayEnabled = shift.isMonday;
    result.isTuesdayEnabled = shift.isTuesday;
    result.isWednesdayEnabled = shift.isWednesday;
    result.isThursdayEnabled = shift.isThursday;
    result.isFridayEnabled = shift.isFriday;
    result.isSaturdayEnabled = shift.isSaturday;
    result.isSundayEnabled = shift.isSunday;

    return result;
  }
}
