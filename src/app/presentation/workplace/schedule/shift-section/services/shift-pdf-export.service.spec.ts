// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { ShiftPdfExportService } from './shift-pdf-export.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { PdfUnicodeTextService } from 'src/app/domain/services/report/pdf-unicode-text.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { HolidaysListHelper } from 'src/app/domain/models/calendar/calendar-rule-class';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { SchedulePdfDrawingService } from '../../schedule-section/services/schedule-pdf-drawing.service';
import {
  OFFICIAL_AND_REMINDER_ORDERINGS,
  REMINDER_RULE,
  SAME_DATE_HOLIDAY_YEAR,
  SECOND_REMINDER_RULE,
  buildHolidaysListHelper,
  sameDateHolidayDate,
} from 'src/app/shared/testing/holiday-list.testing';

interface WeekdayTypeResolver {
  getWeekdayType(date: Date): number;
}

describe('ShiftPdfExportService weekday type with two holiday entries on the same date', () => {
  let holidayCollection: { holidays: HolidaysListHelper };
  let service: WeekdayTypeResolver;

  beforeEach(() => {
    holidayCollection = { holidays: new HolidaysListHelper() };

    TestBed.configureTestingModule({
      providers: [
        ShiftPdfExportService,
        { provide: TranslateService, useValue: {} },
        { provide: LocaleService, useValue: {} },
        { provide: DataManagementScheduleService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: GridColorService, useValue: {} },
        { provide: GridSettingsService, useValue: {} },
        { provide: SchedulePdfDrawingService, useValue: {} },
        { provide: GroupSelectionService, useValue: {} },
        { provide: HolidayCollectionService, useValue: holidayCollection },
        { provide: WeekConfigurationService, useValue: { getWeekendSlot: () => null } },
        { provide: PdfUnicodeTextService, useValue: {} },
      ],
    });
    service = TestBed.inject(ShiftPdfExportService) as unknown as WeekdayTypeResolver;
  });

  it.each(OFFICIAL_AND_REMINDER_ORDERINGS)('reports an official holiday (%s)', (_label, rules) => {
    holidayCollection.holidays = buildHolidaysListHelper(rules);

    expect(service.getWeekdayType(sameDateHolidayDate())).toBe(WeekDaysEnum.OfficiallyHoliday);
  });

  it('reports an unofficial holiday when no entry on the date is official', () => {
    holidayCollection.holidays = buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]);

    expect(service.getWeekdayType(sameDateHolidayDate())).toBe(WeekDaysEnum.Holiday);
  });

  it('reports a workday for a date without a holiday', () => {
    holidayCollection.holidays = buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]);

    expect(service.getWeekdayType(new Date(SAME_DATE_HOLIDAY_YEAR, 11, 24))).toBe(WeekDaysEnum.Workday);
  });
});
