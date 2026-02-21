/**
 * Date Helper
 *
 * Pure functions for date manipulation and formatting.
 */

import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { DomainMessages } from 'src/app/domain/constants/messages';

/**
 * Compares two dates and returns a comparison result.
 *
 * @param firstDate - First date to compare
 * @param secondDate - Second date to compare
 * @returns -1 if first > second, 1 if first < second, 0 if equal
 */
export function EqualDate(
  firstDate: Date | string,
  secondDate: Date | string
): number {
  const first = new Date(firstDate);
  const second = new Date(secondDate);

  return first > second ? -1 : first < second ? 1 : 0;
}

/**
 * Formats a date as a localized long date string.
 *
 * @param date - Date to format
 * @param locale - Locale code (default: DomainMessages.DEFAULT_LANG)
 * @returns Formatted date string (e.g., "Montag 15.03.2025")
 */
export function DateToString(
  date: Date | string,
  locale: string = DomainMessages.DEFAULT_LANG
): string {
  return formatDate(date, 'dddd DD.MM.yyyy', locale);
}

/**
 * Formats a date as a short date string.
 *
 * @param date - Date to format
 * @param locale - Locale code (default: DomainMessages.DEFAULT_LANG)
 * @returns Formatted date string (e.g., "15.03.2025")
 */
export function DateToStringShort(
  date: Date | string,
  locale: string = DomainMessages.DEFAULT_LANG
): string {
  return formatDate(date, 'DD.MM.yyyy', locale);
}

/**
 * Format a date as a string using the given format and locale.
 *
 * @param date - The date to format
 * @param dateFormat - The format string to use
 * @param locale - The locale to use for formatting (default: DomainMessages.DEFAULT_LANG)
 * @returns The formatted date string
 */
function formatDate(
  date: Date | string,
  dateFormat: string,
  locale: string = DomainMessages.DEFAULT_LANG
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const localeObj = locale === 'de' ? de : enUS;

  const dateFnsFormat = dateFormat
    .replace(/dddd/g, 'EEEE')
    .replace(/DD/g, 'dd')
    .replace(/yyyy/g, 'yyyy');

  return format(dateObj, dateFnsFormat, { locale: localeObj });
}

/**
 * Corrects a date for local timezone offset.
 *
 * @param date - Date to correct
 * @returns Corrected date or undefined if input is null/undefined
 */
export function dateWithLocalTimeCorrection(
  date: Date | string | undefined
): Date | undefined {
  if (date === null || date === undefined) {
    return undefined;
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const userTimezoneOffset = -dateObj.getTimezoneOffset();
  const hourDiff = userTimezoneOffset / 60;
  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    hourDiff,
    0,
    0
  );
}

/**
 * Converts UTC date to local date.
 *
 * @param date - UTC date to convert
 * @returns Local date or undefined if input is null
 */
export function utcToLocalDate(date: Date | string): Date | undefined {
  if (date === null) {
    return undefined;
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const userTimezoneOffset = -dateObj.getTimezoneOffset();
  const hourDiff = userTimezoneOffset / 60;
  const d = dateObj.setHours(dateObj.getHours() + hourDiff);
  return new Date(d);
}

/**
 * Adds months to a date.
 *
 * @param date - Base date
 * @param value - Number of months to add (can be negative)
 * @returns New date with months added
 */
export function addMonths(date: Date, value: number): Date {
  const d = new Date(date);
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
export function addDays(date: Date | string, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds seconds to a date.
 *
 * @param date - Base date
 * @param second - Number of seconds to add
 * @returns New date with seconds added
 */
export function addSecond(date: Date | string, second: number): Date {
  const result = new Date(date);
  result.setDate(result.getSeconds() + second);
  return result;
}

/**
 * Corrects a date to UTC timezone.
 *
 * @param date - Date to correct
 * @returns UTC corrected date or undefined if invalid
 */
export function dateWithUTCCorrection(date: Date | string): Date | undefined {
  if (!date) {
    return undefined;
  }

  let parsedDate: Date;

  if (typeof date === 'string') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  if (isNaN(parsedDate.getTime())) {
    return undefined;
  }

  const d = Date.UTC(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    0,
    0,
    0
  );

  return new Date(d);
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
export function equalDate(a: Date | string, b: Date | string) {
  const aa = new Date(a);
  const bb = new Date(b);

  return aa.getTime() - bb.getTime();
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

  if (a.getFullYear() < b.getFullYear()) {
    return false;
  }

  if (a.getMonth() < b.getMonth()) {
    return false;
  }

  if (a.getDate() < b.getDate()) {
    return false;
  }

  if (a.getHours() < b.getHours()) {
    return false;
  }

  if (a.getMinutes() < b.getMinutes()) {
    return false;
  }

  if (a.getSeconds() < b.getSeconds()) {
    return false;
  }

  return true;
}

/**
 * Validates if a date string is valid.
 *
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isDateStringValid(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
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
 * Formats a date as ISO date string (yyyy-MM-dd).
 *
 * @param date - Date to format
 * @returns Date string in format "yyyy-MM-dd"
 */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  let current = new Date(startDate);
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
  const diffTime = target.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
