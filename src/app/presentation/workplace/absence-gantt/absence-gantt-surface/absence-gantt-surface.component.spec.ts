// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { vi } from 'vitest';

import { AbsenceGanttSurfaceComponent } from './absence-gantt-surface.component';
import { HolidaysListHelper } from 'src/app/domain/models/calendar/calendar-rule-class';
import {
  OFFICIAL_AND_REMINDER_ORDERINGS,
  OFFICIAL_HOLIDAY_NAME,
  REMINDER_HOLIDAY_NAME,
  REMINDER_RULE,
  SAME_DATE_HOLIDAY_YEAR,
  SECOND_REMINDER_RULE,
  buildHolidaysListHelper,
} from 'src/app/shared/testing/holiday-list.testing';

describe('AbsenceGanttSurfaceComponent.holidayInfo', () => {
  const COLUMN_OF_HOLIDAY = 1;

  const resolveHolidayInfo = (holidays: HolidaysListHelper, column: number) => {
    const host = {
      drawCalendarGantt: { startDate: new Date(SAME_DATE_HOLIDAY_YEAR, 11, 24) },
      holidayCollection: { holidays, currentYear: SAME_DATE_HOLIDAY_YEAR },
      ensureCorrectYearLoaded: vi.fn(),
    };
    return AbsenceGanttSurfaceComponent.prototype.holidayInfo.call(
      host as unknown as AbsenceGanttSurfaceComponent,
      column
    );
  };

  it.each(OFFICIAL_AND_REMINDER_ORDERINGS)(
    'returns the official entry, the same one the canvas draws (%s)',
    (_label, rules) => {
      const holidays = buildHolidaysListHelper(rules);

      const holiday = resolveHolidayInfo(holidays, COLUMN_OF_HOLIDAY);

      expect(holiday?.officially).toBe(true);
      expect(holiday?.currentName).toEqual({ en: OFFICIAL_HOLIDAY_NAME });
      expect(holiday).toBe(holidays.holidayForDate(new Date(SAME_DATE_HOLIDAY_YEAR, 11, 25)));
    }
  );

  it('returns the first entry when no entry on the date is official', () => {
    const holiday = resolveHolidayInfo(
      buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]),
      COLUMN_OF_HOLIDAY
    );

    expect(holiday?.officially).toBe(false);
    expect(holiday?.currentName).toEqual({ en: REMINDER_HOLIDAY_NAME });
  });

  it('returns undefined for a column without a holiday', () => {
    expect(resolveHolidayInfo(buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]), 0)).toBeUndefined();
  });
});
