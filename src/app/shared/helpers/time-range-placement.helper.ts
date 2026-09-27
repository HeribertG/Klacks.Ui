// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure placement rules for a TimeRange shift: StartShift/EndShift are the permitted window, WorkTime is the
 * actual engagement, so a booking must pick a span inside the window instead of booking the window itself.
 * Equal window bounds are a full day and a window may cross midnight (both via workingTimeDurationMinutes).
 * dayOffset is 1 when the chosen start lies after midnight inside a window that began the evening before,
 * so the work is dated on the day it actually starts.
 * @param windowStart - Lower window bound "HH:mm[:ss]" (the shift's StartShift)
 * @param windowEnd - Upper window bound "HH:mm[:ss]" (the shift's EndShift)
 * @param workTimeHours - The shift's engagement duration in hours
 */

import { formatTimeFromMinutes, timeToMinutes, workingTimeDurationMinutes } from './time-format.helper';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const NEXT_DAY = 1;
const SAME_DAY = 0;

export interface ITimeRangePlacement {
  startTime: string;
  endTime: string;
  workTime: number;
  dayOffset: number;
}

export function timeRangeWindowMinutes(windowStart: string, windowEnd: string): number {
  return workingTimeDurationMinutes(timeToMinutes(windowStart), timeToMinutes(windowEnd));
}

export function defaultTimeRangePlacement(
  windowStart: string,
  windowEnd: string,
  workTimeHours: number,
): ITimeRangePlacement {
  const windowStartMinutes = timeToMinutes(windowStart);
  const windowMinutes = timeRangeWindowMinutes(windowStart, windowEnd);
  const requestedMinutes = Math.round(workTimeHours * MINUTES_PER_HOUR);
  const durationMinutes = requestedMinutes > 0 ? Math.min(requestedMinutes, windowMinutes) : windowMinutes;

  return {
    startTime: formatTimeFromMinutes(windowStartMinutes),
    endTime: formatTimeFromMinutes(windowStartMinutes + durationMinutes),
    workTime: durationMinutes / MINUTES_PER_HOUR,
    dayOffset: SAME_DAY,
  };
}

/**
 * Validates a chosen span against the window and returns the placement to book, or null when the span does
 * not fit. The span is measured with the same wrap rule as every work entry, so an end before the start
 * means the next morning.
 * @param startMinutes - Chosen start, minutes since midnight
 * @param endMinutes - Chosen end, minutes since midnight
 */
export function resolveTimeRangePlacement(
  windowStart: string,
  windowEnd: string,
  startMinutes: number,
  endMinutes: number,
): ITimeRangePlacement | null {
  const windowStartMinutes = timeToMinutes(windowStart);
  const windowMinutes = timeRangeWindowMinutes(windowStart, windowEnd);
  const durationMinutes = workingTimeDurationMinutes(startMinutes, endMinutes);
  const offsetInWindow = (startMinutes - windowStartMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  if (durationMinutes <= 0 || offsetInWindow + durationMinutes > windowMinutes) {
    return null;
  }

  return {
    startTime: formatTimeFromMinutes(startMinutes),
    endTime: formatTimeFromMinutes(endMinutes),
    workTime: durationMinutes / MINUTES_PER_HOUR,
    dayOffset: startMinutes < windowStartMinutes ? NEXT_DAY : SAME_DAY,
  };
}
