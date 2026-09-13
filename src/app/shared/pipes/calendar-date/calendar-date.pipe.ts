// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Formats a calendar date (no time-of-day meaning) like Angular's DatePipe, but parses the value
 * component-wise first, so "yyyy-MM-ddT00:00:00Z" values from the backend show their own day in
 * every browser time zone instead of the previous day west of UTC. The locale comes from
 * LocaleService, the single live source for the active language, not from the bootstrap-frozen
 * LOCALE_ID. Impure and memoized like CompanyDateTimePipe: a pure pipe would keep an already
 * rendered cell in the old language until its input changes, so a language switch left mixed
 * formats on screen until a reload. The trade-off is a call per change-detection run instead of
 * one per input change; the memo keyed on value, format and locale makes that call a reference
 * comparison and re-runs the formatter only when one of the three actually changed. A binding that
 * re-creates its Date on every cycle misses the memo by identity and re-formats each run.
 * @param value - Calendar date in any backend wire format ("yyyy-MM-dd", "...Z", no-Z) or a Date
 * @param format - A LocaleDateStyle ("numericDate", "weekdayDate", "monthYear") resolved against the
 *   locale by locale-date-format.helper, or any Angular date format string; defaults to "mediumDate"
 */

import { formatDate } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import {
  formatCalendarDate,
  isLocaleDateStyle,
} from 'src/app/shared/helpers/locale-date-format.helper';

const DEFAULT_CALENDAR_DATE_FORMAT = 'mediumDate';

interface CalendarDateMemo {
  value: string | Date;
  format: string;
  locale: string;
  result: string | null;
}

@Pipe({
  name: 'calendarDate',
  standalone: true,
  pure: false,
})
export class CalendarDatePipe implements PipeTransform {
  private readonly localeService = inject(LocaleService);
  private memo: CalendarDateMemo | null = null;

  transform(
    value: string | Date | null | undefined,
    format: string = DEFAULT_CALENDAR_DATE_FORMAT,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const locale = this.localeService.getLocale();
    const memo = this.memo;
    if (memo && memo.value === value && memo.format === format && memo.locale === locale) {
      return memo.result;
    }

    const result = this.format(value, format, locale);
    this.memo = { value, format, locale, result };
    return result;
  }

  private format(value: string | Date, format: string, locale: string): string | null {
    if (isLocaleDateStyle(format)) {
      return formatCalendarDate(value, locale, format);
    }

    const date = parseCalendarDate(value);
    return date ? formatDate(date, format, locale) : null;
  }
}
