// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Intl formatting shared by the companyDateTime pipe (templates) and by plain-TS callers such as
 * periods-tab's buildUnsealMessage, so an instant renders identically wherever the company zone
 * is shown. The fixed dd.MM.yyyy template always uses the Gregorian calendar and Latin digits, so a
 * locale with another default calendar or numbering system (e.g. th, ar) cannot change year or digits.
 * @param value - Instant in any ISO wire format ("...Z", "...+02:00") or a Date
 * @param format - Preset name selecting the field layout: "dateTime" (dd.MM.yyyy, HH:mm) or "date" (dd.MM.yyyy)
 * @param locale - Locale used for Intl.DateTimeFormat (e.g. the app's LOCALE_ID)
 * @param zone - IANA company time zone id, or null to fall back to the browser zone
 */

export type CompanyDateTimeFormat = 'dateTime' | 'date';

const GREGORIAN_LATIN_DIGITS: Intl.DateTimeFormatOptions = {
  calendar: 'gregory',
  numberingSystem: 'latn',
};

const COMPANY_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...GREGORIAN_LATIN_DIGITS,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

const COMPANY_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  ...GREGORIAN_LATIN_DIGITS,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

type CompanyDateTimeParts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

const COMPANY_DATE_TIME_FORMAT_OPTIONS: Record<CompanyDateTimeFormat, Intl.DateTimeFormatOptions> = {
  dateTime: COMPANY_DATE_TIME_OPTIONS,
  date: COMPANY_DATE_OPTIONS,
};

const COMPANY_DATE_TIME_TEMPLATES: Record<CompanyDateTimeFormat, (parts: CompanyDateTimeParts) => string> = {
  dateTime: (parts) => `${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`,
  date: (parts) => `${parts.day}.${parts.month}.${parts.year}`,
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
  const parts: CompanyDateTimeParts = {};
  for (const part of new Intl.DateTimeFormat(locale, options).formatToParts(date)) {
    parts[part.type] = part.value;
  }

  return COMPANY_DATE_TIME_TEMPLATES[format](parts);
}
