// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Formats an instant (a real point in time, not a calendar date) in the configured company time
 * zone via Intl.DateTimeFormat (delegated to company-date-time.formatter, shared with plain-TS
 * callers like periods-tab), because Angular's DatePipe timezone parameter only accepts fixed
 * UTC offsets, not IANA zone ids, and cannot follow DST. Falls back to the browser zone when no
 * company zone has been set yet. Impure and memoized: the company zone is a signal that can flip
 * once, right after login, after this pipe has already rendered with the browser-zone fallback; a
 * pure pipe bound to the same instant value would never notice that flip, so this pipe re-checks
 * the zone on every change-detection run and the memo avoids re-running Intl.DateTimeFormat when
 * nothing actually changed. The locale comes from LocaleService, the single live source for the
 * active language, not from the bootstrap-frozen LOCALE_ID; because the pipe is impure it also
 * picks up a language switch on the next change-detection run.
 * @param value - Instant in any ISO wire format ("...Z", "...+02:00") or a Date
 * @param format - Preset name selecting the field layout: "dateTime" (date plus HH:mm), "date" (date
 *   only) or "dayMonthTime" (day and month plus HH:mm, for compact list columns that omit the year)
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import { companyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { CompanyDateTimeFormat, formatCompanyInstant } from './company-date-time.formatter';

export type { CompanyDateTimeFormat };

const DEFAULT_COMPANY_DATE_TIME_FORMAT: CompanyDateTimeFormat = 'dateTime';

interface CompanyDateTimeMemo {
  value: string | Date;
  format: CompanyDateTimeFormat;
  zone: string | null;
  locale: string;
  result: string | null;
}

@Pipe({
  name: 'companyDateTime',
  standalone: true,
  pure: false,
})
export class CompanyDateTimePipe implements PipeTransform {
  private readonly localeService = inject(LocaleService);
  private memo: CompanyDateTimeMemo | null = null;

  transform(
    value: string | Date | null | undefined,
    format: CompanyDateTimeFormat = DEFAULT_COMPANY_DATE_TIME_FORMAT,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const zone = companyTimeZone();
    const locale = this.localeService.getLocale();
    const memo = this.memo;
    if (
      memo &&
      memo.value === value &&
      memo.format === format &&
      memo.zone === zone &&
      memo.locale === locale
    ) {
      return memo.result;
    }

    const result = formatCompanyInstant(value, format, locale, zone);
    this.memo = { value, format, zone, locale, result };
    return result;
  }
}
