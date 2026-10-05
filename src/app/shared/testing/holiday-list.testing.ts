// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Spec-only fixtures for calendar selections that contain two entries on the same date, for example an official
 * national holiday and a second calendar that only marks the same day as a reminder.
 * @param rules - Calendar rules the helper computes its holiday list from
 * @param year - Year the holiday list is centred on (the helper computes the year before and after as well)
 */

import { HolidaysListHelper, ICalendarRule } from 'src/app/domain/models/calendar/calendar-rule-class';

export const SAME_DATE_HOLIDAY_YEAR = 2026;
export const SAME_DATE_RULE = '12/25';
export const OFFICIAL_HOLIDAY_NAME = 'Christmas official';
export const REMINDER_HOLIDAY_NAME = 'Christmas reminder';
export const SECOND_REMINDER_HOLIDAY_NAME = 'Christmas second reminder';

export function sameDateHolidayDate(): Date {
  return new Date(SAME_DATE_HOLIDAY_YEAR, 11, 25);
}

export function buildCalendarRule(
  id: string,
  country: string,
  name: string,
  isMandatory: boolean,
  rule = SAME_DATE_RULE
): ICalendarRule {
  return {
    id,
    rule,
    name: { en: name },
    state: 'ALL',
    country,
    isMandatory,
    isPaid: true,
    subRule: undefined,
  };
}

export const OFFICIAL_RULE = buildCalendarRule('official', 'CH', OFFICIAL_HOLIDAY_NAME, true);
export const REMINDER_RULE = buildCalendarRule('reminder', 'US', REMINDER_HOLIDAY_NAME, false);
export const SECOND_REMINDER_RULE = buildCalendarRule('reminder-2', 'DE', SECOND_REMINDER_HOLIDAY_NAME, false);

export const OFFICIAL_AND_REMINDER_ORDERINGS: (readonly [string, ICalendarRule[]])[] = [
  ['reminder first', [REMINDER_RULE, OFFICIAL_RULE]],
  ['official first', [OFFICIAL_RULE, REMINDER_RULE]],
];

export function buildHolidaysListHelper(
  rules: ICalendarRule[],
  year = SAME_DATE_HOLIDAY_YEAR
): HolidaysListHelper {
  const helper = new HolidaysListHelper();
  helper.currentYear = year;
  helper.addRange(rules);
  helper.computeHolidays();
  return helper;
}
