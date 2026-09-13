// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Converts a week start day into the ngb datepicker numbering (1 = Monday .. 7 = Sunday), which
 * differs from both the JS Date.getDay() numbering and Angular's getLocaleFirstDayOfWeek
 * (0 = Sunday .. 6 = Saturday). The admin-configured week start wins; only when no day is
 * configured does the locale decide, so an English installation starts the week on Sunday and an
 * Arabic one on Saturday instead of always on Monday.
 * @param jsDay - Week start in JS/Angular numbering (0 = Sunday .. 6 = Saturday)
 * @param locale - Angular locale id whose data is registered (see LocaleDataLoaderService)
 * @param configuredJsDay - Admin-configured week start in JS numbering, or null when unset
 */

import { getLocaleFirstDayOfWeek } from '@angular/common';

const SUNDAY_JS_DAY = 0;
const SUNDAY_NGB_DAY = 7;

export function toNgbFirstDayOfWeek(jsDay: number): number {
  return jsDay === SUNDAY_JS_DAY ? SUNDAY_NGB_DAY : jsDay;
}

export function resolveNgbFirstDayOfWeek(locale: string, configuredJsDay: number | null): number {
  return toNgbFirstDayOfWeek(configuredJsDay ?? getLocaleFirstDayOfWeek(locale));
}
