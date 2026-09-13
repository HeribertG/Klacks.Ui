// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single locale-aware formatter for calendar dates (values without a time-of-day meaning),
 * used by the ngb date parser/formatter, the calendarDate pipe, date.helper and every report
 * or list that used to hard-code the Swiss dd.MM.yyyy layout. The numeric pattern is taken from
 * the registered Angular locale data (CLDR short date) and widened to a four-digit year, because
 * CLDR's short pattern is two-digit in several languages (de, en, it, th) and a two-digit year is
 * ambiguous in an editable input. Angular's formatDate is always Gregorian with Latin digits, so a
 * language whose default calendar is not Gregorian (th, ar) cannot leak a Buddhist or Hijri year.
 * @param value - Calendar value in any backend wire format ("yyyy-MM-dd", "...Z", no-Z) or a Date
 * @param locale - Angular locale id whose data is registered (see LocaleDataLoaderService)
 * @param style - Field layout: "numericDate" (31.12.2026), "weekdayDate" (Donnerstag 31.12.2026)
 *   or "monthYear" (Dezember 2026, but year-first as 2026年12月 in Japanese and Chinese)
 */

import { FormatWidth, formatDate, getLocaleDateFormat } from '@angular/common';

import { parseCalendarDate } from './calendar-date.helper';
import { GREGORIAN_LATIN_INTL_OPTIONS } from './intl-format-options.helper';

export type LocalePatternDateStyle = 'numericDate' | 'weekdayDate';
export type LocaleDateStyle = LocalePatternDateStyle | 'monthYear';

const YEAR_TOKENS = /y+/g;
const FOUR_DIGIT_YEAR = 'yyyy';
const WEEKDAY_TOKEN = 'EEEE';
const PATTERN_SEPARATOR = ' ';
const DEFAULT_DATE_STYLE: LocaleDateStyle = 'numericDate';

const MONTH_YEAR_OPTIONS: Intl.DateTimeFormatOptions = {
  ...GREGORIAN_LATIN_INTL_OPTIONS,
  month: 'long',
  year: 'numeric',
};

export function localeNumericDatePattern(locale: string): string {
  return getLocaleDateFormat(locale, FormatWidth.Short).replace(YEAR_TOKENS, FOUR_DIGIT_YEAR);
}

export function localeDatePattern(locale: string, style: LocalePatternDateStyle): string {
  return style === 'weekdayDate'
    ? `${WEEKDAY_TOKEN}${PATTERN_SEPARATOR}${localeNumericDatePattern(locale)}`
    : localeNumericDatePattern(locale);
}

export function isLocaleDateStyle(candidate: string): candidate is LocaleDateStyle {
  return candidate === 'numericDate' || candidate === 'weekdayDate' || candidate === 'monthYear';
}

export function formatCalendarDate(
  value: string | Date | null | undefined,
  locale: string,
  style: LocaleDateStyle = DEFAULT_DATE_STYLE,
): string | null {
  const date = parseCalendarDate(value);
  if (!date) {
    return null;
  }

  return style === 'monthYear'
    ? new Intl.DateTimeFormat(locale, MONTH_YEAR_OPTIONS).format(date)
    : formatDate(date, localeDatePattern(locale, style), locale);
}
