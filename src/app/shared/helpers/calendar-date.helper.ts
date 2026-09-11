// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single parser and single sender for calendar-date wire values (Option C: local midnight,
 * parsed component-wise, local getters), plus "yyyy-MM-dd" keys (formatDateOnly for a Date read
 * with local getters, calendarDateKey for any accepted value) and same-day comparison built
 * on that parser. Also provides the company "today" used as the calendar anchor instead of the
 * browser's local today, and the company time zone itself as a signal so a consumer (e.g. the
 * companyDateTime pipe) can react once the zone is set after login instead of staying stuck on
 * whatever it read before that happened.
 * @param value - Calendar value in any wire format ("yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ssZ", "yyyy-MM-ddTHH:mm:ss")
 *   or a local-midnight Date; parsed by parseCalendarDate and serialized back by toCalendarDateWire
 * @param date - Date whose local year/month/day formatDateOnly writes as "yyyy-MM-dd"
 * @param first - First calendar value of a same-day comparison (any accepted wire format or Date)
 * @param second - Second calendar value of a same-day comparison (any accepted wire format or Date)
 * @param zone - IANA time zone id used as the company clock, or null to fall back to the browser zone;
 *   an id Intl does not accept (e.g. a Windows id) is ignored with a warning and treated as null
 */

import { signal } from '@angular/core';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WIRE_LOCALE = 'en-CA';
const DATE_PART_WIDTH = 2;
const DATE_PART_PAD = '0';
const NO_CALENDAR_DATE_KEY = '';
const INVALID_CALENDAR_DATE_MESSAGE = 'Invalid calendar date';
const INVALID_TIME_ZONE_MESSAGE = 'Ignoring unsupported company time zone, falling back to the browser zone';

const companyTimeZoneSignal = signal<string | null>(null);

export function setCompanyTimeZone(zone: string | null): void {
  companyTimeZoneSignal.set(zone ? validTimeZoneOrNull(zone) : null);
}

function validTimeZoneOrNull(zone: string): string | null {
  try {
    new Intl.DateTimeFormat(WIRE_LOCALE, { timeZone: zone });
    return zone;
  } catch {
    console.warn(`${INVALID_TIME_ZONE_MESSAGE}: ${zone}`);
    return null;
  }
}

export function companyTimeZone(): string | null {
  return companyTimeZoneSignal();
}

export function parseCalendarDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const datePart = value.slice(0, 10);
  if (!CALENDAR_DATE_PATTERN.test(datePart)) {
    return null;
  }

  const [year, month, day] = datePart.split('-').map((part) => Number(part));
  const parsed = new Date(year, month - 1, day);
  const isRoundTripStable =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return isRoundTripStable ? parsed : null;
}

export function formatDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(DATE_PART_WIDTH, DATE_PART_PAD);
  const day = String(date.getDate()).padStart(DATE_PART_WIDTH, DATE_PART_PAD);
  return `${date.getFullYear()}-${month}-${day}`;
}

export function calendarDateKey(value: string | Date | null | undefined): string {
  const date = parseCalendarDate(value);
  return date ? formatDateOnly(date) : NO_CALENDAR_DATE_KEY;
}

export function isSameCalendarDate(
  first: string | Date | null | undefined,
  second: string | Date | null | undefined,
): boolean {
  const firstKey = calendarDateKey(first);
  return firstKey !== NO_CALENDAR_DATE_KEY && firstKey === calendarDateKey(second);
}

export function toCalendarDateWire(value: Date | string): string {
  const date = parseCalendarDate(value);
  if (!date) {
    throw new RangeError(`${INVALID_CALENDAR_DATE_MESSAGE}: ${String(value)}`);
  }

  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  return new Date(utcMidnight).toISOString();
}

export function companyToday(): Date {
  const now = new Date();
  const zone = companyTimeZone();

  if (!zone) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const parts = new Intl.DateTimeFormat(WIRE_LOCALE, {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return new Date(year, month - 1, day);
}
