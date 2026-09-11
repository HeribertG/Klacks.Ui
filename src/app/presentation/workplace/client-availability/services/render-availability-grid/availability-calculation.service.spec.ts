// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AvailabilityCalculationService } from './availability-calculation.service';
import { AvailabilitySettingService } from '../availability-setting.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { HourGroupingMode } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
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

function buildService(): AvailabilityCalculationService {
  TestBed.configureTestingModule({
    providers: [
      AvailabilityCalculationService,
      { provide: AvailabilitySettingService, useValue: buildSettingsStub() },
      { provide: HolidayCollectionService, useValue: {} },
      { provide: WeekConfigurationService, useValue: {} },
      { provide: TranslateService, useValue: { currentLang: 'de', instant: (key: string) => key } },
    ],
  });
  return TestBed.inject(AvailabilityCalculationService);
}

describe('AvailabilityCalculationService.dateHourToColumn across a DST transition', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Europe/Zurich spring-forward (2026-03-29)', () => {
    useTimeZone('Europe/Zurich');

    it('lands two calendar days later on column 48, not 24', () => {
      const service = buildService();
      service.startDate = new Date(2026, 2, 28);

      expect(service.dateHourToColumn(new Date(2026, 2, 30), 0)).toBe(48);
    });
  });

  describe('America/New_York spring-forward (2026-03-08)', () => {
    useTimeZone('America/New_York');

    it('lands two calendar days later on column 48, not 24', () => {
      const service = buildService();
      service.startDate = new Date(2026, 2, 7);

      expect(service.dateHourToColumn(new Date(2026, 2, 9), 0)).toBe(48);
    });
  });
});
