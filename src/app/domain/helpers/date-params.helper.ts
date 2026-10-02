// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Formats the date-carrying translation parameters of a backend finding (validUntil, triggerDate,
 * dueDate, seasonFrom, seasonTo - see localized-date-params.constants) in the reader's locale, so a
 * message reads "valid until 31.12.2026" instead of "valid until 2026-12-31". Selection is by parameter
 * name only; a value that does not parse (including one that was already formatted) stays as the backend
 * sent it, so applying the function twice is harmless and no parameter is ever dropped.
 * @param params - Translation parameters as received from the backend
 * @param locale - The reader's Angular locale id from LocaleService (e.g. "de", "ar", "zh-CN")
 */

import {
  CALENDAR_DATE_PARAM_KEYS,
  MONTH_DAY_PARAM_KEYS,
} from 'src/app/domain/constants/localized-date-params.constants';
import { formatCalendarDate, formatMonthDay } from 'src/app/shared/helpers/locale-date-format.helper';

export function formatDateParams(
  params: Record<string, string> | null | undefined,
  locale: string,
): Record<string, string> {
  if (!params) {
    return {};
  }

  const formatted: Record<string, string> = { ...params };
  for (const key of CALENDAR_DATE_PARAM_KEYS) {
    if (key in formatted) {
      formatted[key] = formatCalendarDate(formatted[key], locale) ?? formatted[key];
    }
  }
  for (const key of MONTH_DAY_PARAM_KEYS) {
    if (key in formatted) {
      formatted[key] = formatMonthDay(formatted[key], locale) ?? formatted[key];
    }
  }

  return formatted;
}

export function hasDateParams(params: Record<string, string> | null | undefined): boolean {
  return (
    !!params &&
    [...CALENDAR_DATE_PARAM_KEYS, ...MONTH_DAY_PARAM_KEYS].some((key) => key in params)
  );
}
