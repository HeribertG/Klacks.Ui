// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AvailabilityCalculationService } from './availability-calculation.service';
import { AvailabilitySettingService } from '../availability-setting.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { HourGroupingMode } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { HolidaysListHelper } from 'src/app/domain/models/calendar/calendar-rule-class';
import {
  OFFICIAL_AND_REMINDER_ORDERINGS,
  OFFICIAL_RULE,
  REMINDER_RULE,
  SAME_DATE_HOLIDAY_YEAR,
  SECOND_REMINDER_RULE,
  buildHolidaysListHelper,
  sameDateHolidayDate,
} from 'src/app/shared/testing/holiday-list.testing';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';

function buildSettingsStub(): AvailabilitySettingService {
  return {
    hourGroupingMode: () => HourGroupingMode.OneHour,
    columnsPerDay: 24,
    cellWidth: 38,
    cellHeight: 32,
    cellHeaderHeight: 55,
  } as unknown as AvailabilitySettingService;
}

function buildService(holidays?: HolidaysListHelper): AvailabilityCalculationService {
  TestBed.configureTestingModule({
    providers: [
      AvailabilityCalculationService,
      { provide: AvailabilitySettingService, useValue: buildSettingsStub() },
      { provide: HolidayCollectionService, useValue: holidays ? { holidays } : {} },
      { provide: WeekConfigurationService, useValue: {} },
      { provide: TranslateService, useValue: { currentLang: 'de', instant: (key: string) => key } },
    ],
  });
  return TestBed.inject(AvailabilityCalculationService);
}

describe('AvailabilityCalculationService holiday status with two entries on the same date', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it.each(OFFICIAL_AND_REMINDER_ORDERINGS)('reports the date as an official holiday (%s)', (_label, rules) => {
    const service = buildService(buildHolidaysListHelper(rules));

    expect(service.isHoliday(sameDateHolidayDate())).toBe(true);
    expect(service.isOfficialHoliday(sameDateHolidayDate())).toBe(true);
  });

  it('reports an unofficial holiday when no entry on the date is official', () => {
    const service = buildService(buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]));

    expect(service.isHoliday(sameDateHolidayDate())).toBe(true);
    expect(service.isOfficialHoliday(sameDateHolidayDate())).toBe(false);
  });

  it('reports no holiday for another date', () => {
    const service = buildService(buildHolidaysListHelper([OFFICIAL_RULE, REMINDER_RULE]));
    const otherDate = new Date(SAME_DATE_HOLIDAY_YEAR, 11, 24);

    expect(service.isHoliday(otherDate)).toBe(false);
    expect(service.isOfficialHoliday(otherDate)).toBe(false);
  });
});

describe('AvailabilityCalculationService.dateHourToColumn across a DST transition', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Europe/Zurich spring-forward (2026-03-29)', () => {
    useTimeZone('Europe/Zurich');

    it('lands two calendar days later on column 48, not 24', () => {
      expect(new Date(2026, 2, 30).getTimezoneOffset()).not.toBe(new Date(2026, 2, 28).getTimezoneOffset());
      const service = buildService();
      service.startDate = new Date(2026, 2, 28);

      expect(service.dateHourToColumn(new Date(2026, 2, 30), 0)).toBe(48);
    });
  });

  describe('America/New_York spring-forward (2026-03-08)', () => {
    useTimeZone('America/New_York');

    it('lands two calendar days later on column 48, not 24', () => {
      expect(new Date(2026, 2, 9).getTimezoneOffset()).not.toBe(new Date(2026, 2, 7).getTimezoneOffset());
      const service = buildService();
      service.startDate = new Date(2026, 2, 7);

      expect(service.dateHourToColumn(new Date(2026, 2, 9), 0)).toBe(48);
    });
  });
});
