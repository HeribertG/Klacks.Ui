// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Compares the dates and times of two shifts by their meaning. A loaded shift holds them as server text ("2026-12-01T00:00:00",
 * "07:00:00"), the shift form writes them back as a Date and as "7:0:00", so the same value differs as a raw property.
 * Dates compare by calendar day, times by the minutes the form can show.
 * @param SHIFT_DATE_FIELDS - Calendar fields of a shift
 * @param SHIFT_TIME_FIELDS - Clock and duration fields of a shift the form writes back as text
 */

import { calendarDateKey } from 'src/app/domain/helpers/calendar-date.helper';
import { transformOwnTimeToNumber, transformStringToOwnTimeStruct } from 'src/app/domain/helpers/own-time.helper';
import { IShift } from 'src/app/domain/models/shift/shift.interface';

export const SHIFT_DATE_FIELDS = ['fromDate', 'untilDate'] as const;

export const SHIFT_TIME_FIELDS = [
  'startShift',
  'endShift',
  'beforeShift',
  'afterShift',
  'travelTimeBefore',
  'travelTimeAfter',
  'briefingTime',
  'debriefingTime',
] as const;

const timeInHours = (value: string): number => transformOwnTimeToNumber(transformStringToOwnTimeStruct(value, true));

export function hasShiftScheduleChange(shift: IShift, baseline: IShift): boolean {
  return (
    SHIFT_DATE_FIELDS.some((field) => calendarDateKey(shift[field]) !== calendarDateKey(baseline[field])) ||
    SHIFT_TIME_FIELDS.some((field) => timeInHours(shift[field]) !== timeInHours(baseline[field]))
  );
}

/** The other dates and times of a locked shift stay as saved: the form writes them back in its own format and minutes. */
export function keepStoredDatesAndTimes(shift: IShift, baseline: IShift): void {
  shift.fromDate = baseline.fromDate;
  shift.workTime = baseline.workTime;
  SHIFT_TIME_FIELDS.forEach((field) => {
    shift[field] = baseline[field];
  });
}
