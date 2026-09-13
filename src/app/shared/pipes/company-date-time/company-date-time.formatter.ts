// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Intl formatting shared by the companyDateTime pipe (templates) and by plain-TS callers such as
 * periods-tab's buildUnsealMessage, so an instant renders identically wherever the company zone
 * is shown. Field order and separators come from the locale (12/31/2026 under English, 2026/12/31
 * under Japanese) instead of a fixed Swiss dd.MM.yyyy template, while the Gregorian calendar and
 * Latin digits stay pinned, so a locale with another default calendar or numbering system (e.g. th,
 * ar) cannot change year or digits. The hour cycle stays h23: the app shows 24h time everywhere.
 * @param value - Instant in any ISO wire format ("...Z", "...+02:00") or a Date
 * @param format - Preset name selecting the field layout: "dateTime" (date plus HH:mm), "date" (date
 *   only) or "dayMonthTime" (day and month plus HH:mm, for compact list columns that omit the year)
 * @param locale - Locale used for Intl.DateTimeFormat (the active language from LocaleService)
 * @param zone - IANA company time zone id, or null to fall back to the browser zone
 */

import { GREGORIAN_LATIN_INTL_OPTIONS } from 'src/app/shared/helpers/intl-format-options.helper';

export type CompanyDateTimeFormat = 'dateTime' | 'date' | 'dayMonthTime';

const COMPANY_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...GREGORIAN_LATIN_INTL_OPTIONS,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

const COMPANY_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  ...GREGORIAN_LATIN_INTL_OPTIONS,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const COMPANY_DAY_MONTH_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...GREGORIAN_LATIN_INTL_OPTIONS,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

const COMPANY_DATE_TIME_FORMAT_OPTIONS: Record<CompanyDateTimeFormat, Intl.DateTimeFormatOptions> = {
  dateTime: COMPANY_DATE_TIME_OPTIONS,
  date: COMPANY_DATE_OPTIONS,
  dayMonthTime: COMPANY_DAY_MONTH_TIME_OPTIONS,
};

export function formatCompanyInstant(
  value: string | Date,
  format: CompanyDateTimeFormat,
  locale: string,
  zone: string | null,
): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }

  const baseOptions = COMPANY_DATE_TIME_FORMAT_OPTIONS[format];
  const options: Intl.DateTimeFormatOptions = zone ? { ...baseOptions, timeZone: zone } : baseOptions;

  return new Intl.DateTimeFormat(locale, options).format(date);
}
