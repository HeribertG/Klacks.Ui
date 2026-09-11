// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Formats a calendar date (no time-of-day meaning) like Angular's DatePipe, but parses the value
 * component-wise first, so "yyyy-MM-ddT00:00:00Z" values from the backend show their own day in
 * every browser time zone instead of the previous day west of UTC.
 * @param value - Calendar date in any backend wire format ("yyyy-MM-dd", "...Z", no-Z) or a Date
 * @param format - Angular date format string; defaults to DatePipe's "mediumDate"
 */

import { formatDate } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';

const DEFAULT_CALENDAR_DATE_FORMAT = 'mediumDate';

@Pipe({
  name: 'calendarDate',
  standalone: true,
})
export class CalendarDatePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: string | Date | null | undefined,
    format: string = DEFAULT_CALENDAR_DATE_FORMAT,
  ): string | null {
    const date = parseCalendarDate(value);
    return date ? formatDate(date, format, this.locale) : null;
  }
}
