// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Date Helper
 *
 * Pure functions for date manipulation and formatting. formatDateOnly and the UTC-midnight
 * conversion of dateWithUTCCorrection are implemented once in calendar-date.helper and only
 * re-exported/delegated here. addMonths/addDays/getDateKeysBetween clone their input via
 * valueOf() rather than getTime() on purpose, so a string mistyped as Date does not throw
 * (it is still parsed as UTC; callers must pass real Dates).
 */

export const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
import { DomainMessages } from 'src/app/domain/constants/messages';
import { formatDateOnly, parseCalendarDate, toCalendarDateWire } from './calendar-date.helper';
import { formatCalendarDate } from './locale-date-format.helper';

const EMPTY_DATE_TEXT = '';

export { formatDateOnly };

/**
 * Compares two dates and returns a comparison result.
 *
 * @param firstDate - First date to compare
 * @param secondDate - Second date to compare
 * @returns -1 if first > second, 1 if first < second, 0 if equal
 */
export function EqualDate(firstDate: Date, secondDate: Date): number {
  const first = firstDate.getTime();
  const second = secondDate.getTime();

  return first > second ? -1 : first < second ? 1 : 0;
}

/**
 * Formats a date as a localized long date string: weekday name plus the numeric date layout of
 * the given locale, so a French user reads "jeudi 31/12/2026" instead of an English weekday name
 * in a Swiss layout.
 *
 * @param date - Date to format
 * @param locale - Locale code (default: DomainMessages.DEFAULT_LANG)
 * @returns Formatted date string (e.g., "Montag 15.03.2025"), or an empty string for an invalid date
 */
export function DateToString(
  date: Date,
  locale: string = DomainMessages.DEFAULT_LANG
): string {
  return formatCalendarDate(date, locale, 'weekdayDate') ?? EMPTY_DATE_TEXT;
}

/**
 * Formats a date in the numeric date layout of the given locale.
 *
 * @param date - Date to format
 * @param locale - Locale code (default: DomainMessages.DEFAULT_LANG)
 * @returns Formatted date string (e.g., "15.03.2025"), or an empty string for an invalid date
 */
export function DateToStringShort(
  date: Date,
  locale: string = DomainMessages.DEFAULT_LANG
): string {
  return formatCalendarDate(date, locale, 'numericDate') ?? EMPTY_DATE_TEXT;
}

/**
 * Formats a backend calendar-date value as a short date string. The value is parsed
 * component-wise (see parseCalendarDate), so it shows its own day in every time zone.
 *
 * @param value - Calendar-date wire value ("yyyy-MM-dd" or "yyyy-MM-ddTHH:mm:ss[Z]")
 * @param locale - Locale code (default: DomainMessages.DEFAULT_LANG)
 * @returns Formatted date string (e.g., "15.03.2025"), or the unchanged value if it is not a calendar date
 */
export function CalendarDateToStringShort(
  value: string,
  locale: string = DomainMessages.DEFAULT_LANG
): string {
  return formatCalendarDate(value, locale, 'numericDate') ?? value;
}

/**
 * Adds months to a date.
 *
 * @param date - Base date
 * @param value - Number of months to add (can be negative)
 * @returns New date with months added
 */
export function addMonths(date: Date, value: number): Date {
  const d = new Date(date.valueOf());
  const n = date.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + value);
  d.setDate(Math.min(n, getDaysInMonth(d.getFullYear(), d.getMonth())));
  return d;
}

/**
 * Adds days to a date.
 *
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.valueOf());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns UTC midnight of the calendar day of the given value. Strings from the backend are
 * parsed component-wise (see parseCalendarDate); Date values are read with local getters.
 *
 * @param date - Date or backend calendar-date string
 * @returns UTC-midnight date or undefined if empty or invalid
 */
export function dateWithUTCCorrection(date: Date | string): Date | undefined {
  const calendarDate = parseCalendarDate(date);
  return calendarDate ? new Date(toCalendarDateWire(calendarDate)) : undefined;
}

/**
 * Compares two dates for equality (year, month, day only).
 *
 * @param a - First date
 * @param b - Second date
 * @returns true if dates are equal, false otherwise
 */
export function compareDate(a: Date, b: Date): boolean {
  if (a === null && b === null) {
    return true;
  }

  if (a.getFullYear() !== b.getFullYear()) {
    return false;
  }

  if (a.getMonth() !== b.getMonth()) {
    return false;
  }

  if (a.getDate() !== b.getDate()) {
    return false;
  }

  return true;
}

/**
 * Calculates the difference between two dates in milliseconds.
 *
 * @param a - First date
 * @param b - Second date
 * @returns Difference in milliseconds
 */
export function equalDate(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

/**
 * Checks if date a is after or equal to date b (including time).
 *
 * @param a - First date
 * @param b - Second date
 * @returns true if a >= b, false otherwise
 */
export function isDateOver(a: Date, b: Date): boolean {
  if (a === null && b === null) {
    return true;
  }

  return a.getTime() >= b.getTime();
}

/**
 * Validates if a date string is valid.
 *
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isDateStringValid(dateString: string): boolean {
  return parseCalendarDate(dateString) !== null;
}

/**
 * Checks if a year is a leap year.
 *
 * @param year - Year to check
 * @returns true if leap year, false otherwise
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Gets the number of days in a month.
 *
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Number of days in the month
 */
export function getDaysInMonth(year: number, month: number): number {
  return [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month];
}

/**
 * Calculates the number of days between two dates.
 *
 * @param a - Start date
 * @param b - End date
 * @returns Number of days between dates
 */
export function daysBetweenDates(
  a: Date | null | undefined,
  b: Date | null | undefined
): number {
  if (!a || !b) {
    return 0;
  }

  const aa = dateWithUTCCorrection(a) as Date;
  const bb = dateWithUTCCorrection(b) as Date;

  if (!aa || !bb) {
    return 0;
  }

  const Difference_In_Time = bb.getTime() - aa.getTime();
  return Difference_In_Time / (1000 * 60 * 60 * 24);
}

/**
 * Returns the Monday of the ISO week containing the given date-only string. Mirrors the backend's
 * ScheduleValidationBuilder.IsoWeekOf, which anchors weekly violations on Monday. The string is parsed
 * component-wise on purpose: new Date('yyyy-MM-dd') is read as UTC and would shift the weekday in
 * negative-offset time zones.
 *
 * @param dateOnly - Date in format "yyyy-MM-dd"
 * @returns Monday of that ISO week in format "yyyy-MM-dd", or an empty string if unparsable
 */
export function isoWeekMondayOf(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    return '';
  }

  const date = new Date(year, month - 1, day);
  const offsetFromMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offsetFromMonday);
  return formatDateOnly(date);
}

/**
 * Gets all date keys between two dates (inclusive).
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of date strings in format "yyyy-MM-dd"
 */
export function getDateKeysBetween(startDate: Date, endDate: Date): string[] {
  const keys: string[] = [];
  let current = new Date(startDate.valueOf());
  while (current <= endDate) {
    keys.push(formatDateOnly(current));
    current = addDays(current, 1);
  }
  return keys;
}

/**
 * Calculates the day index between two dates.
 *
 * @param startDate - Reference start date
 * @param targetDate - Target date
 * @returns Number of days from start to target
 */
export function getDayIndex(startDate: Date, targetDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffMs = target.getTime() - start.getTime();
  return Math.round(diffMs / MS_PER_DAY);
}
