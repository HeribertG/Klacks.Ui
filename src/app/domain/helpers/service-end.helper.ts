// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells whether a service (a work entry) has ended on the company clock. Mirrors the backend rule the confirmation is
 * guarded by: the end is the entry's day plus its end time, one day later when the end is not after the start (night
 * shift; equal times are a 24 hour duty). The hint in the schedule menu is a convenience, the backend decides.
 * @param entryDate - Calendar day of the entry
 * @param startTime - Start of the service as "HH:mm" or "HH:mm:ss"
 * @param endTime - End of the service as "HH:mm" or "HH:mm:ss"
 * @param now - The instant to measure against; the company clock is applied to it
 */

import { companyTimeZone, parseCalendarDate } from './calendar-date.helper';
import { GREGORIAN_LATIN_INTL_OPTIONS } from './intl-format-options.helper';

const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;
const MINUTES_PER_HOUR = 60;
const NEXT_DAY_OFFSET = 1;
const WIRE_LOCALE = 'en-CA';
const HOUR_CYCLE_ZERO_TO_23 = 'h23';
const NO_VALUE = 0;

export function hasServiceEnded(
  entryDate: Date | string,
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): boolean {
  const day = parseCalendarDate(entryDate);
  const start = minutesOfDay(startTime);
  const end = minutesOfDay(endTime);
  if (!day || start === null || end === null) {
    return true;
  }

  const endDayOffset = end <= start ? NEXT_DAY_OFFSET : NO_VALUE;
  const endMoment = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate() + endDayOffset, NO_VALUE, end);

  return endMoment <= companyWallClockMinutes(now);
}

function minutesOfDay(time: string): number | null {
  const match = TIME_PATTERN.exec(time ?? '');
  return match ? Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]) : null;
}

function companyWallClockMinutes(now: Date): number {
  const zone = companyTimeZone();
  if (!zone) {
    return wallClock(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());
  }

  const parts = new Intl.DateTimeFormat(WIRE_LOCALE, {
    ...GREGORIAN_LATIN_INTL_OPTIONS,
    timeZone: zone,
    hourCycle: HOUR_CYCLE_ZERO_TO_23,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value);

  return wallClock(part('year'), part('month'), part('day'), part('hour'), part('minute'));
}

function wallClock(year: number, month: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, month - 1, day, hour, minute);
}
