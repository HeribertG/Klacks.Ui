// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { WeekConfigurationService } from './week-configuration.service';
import { AppSettingsManagementService } from './app-settings-management.service';
import { ISchedulingDefaultSettings, SchedulingDefaultSettings } from 'src/app/domain/models/settings/app-settings.model';

describe('WeekConfigurationService', () => {
  let service: WeekConfigurationService;
  let schedulingDefaultSettings: ReturnType<typeof signal<ISchedulingDefaultSettings>>;

  function setup(overrides: Partial<ISchedulingDefaultSettings>): void {
    schedulingDefaultSettings = signal<ISchedulingDefaultSettings>({
      ...new SchedulingDefaultSettings(),
      ...overrides,
    });

    TestBed.configureTestingModule({
      providers: [
        WeekConfigurationService,
        {
          provide: AppSettingsManagementService,
          useValue: { schedulingDefaultSettings },
        },
      ],
    });

    service = TestBed.inject(WeekConfigurationService);
  }

  describe('default configuration (Saturday/Sunday weekend, Monday week start)', () => {
    beforeEach(() => setup({}));

    it('treats Saturday and Sunday as weekend', () => {
      expect(service.isWeekend(new Date(2026, 6, 11))).toBe(true); // Saturday
      expect(service.isWeekend(new Date(2026, 6, 12))).toBe(true); // Sunday
    });

    it('does not treat weekdays as weekend', () => {
      expect(service.isWeekend(new Date(2026, 6, 8))).toBe(false); // Wednesday
    });

    it('resolves week start to Monday for any day in the week', () => {
      const wednesday = new Date(2026, 6, 8);
      const sunday = new Date(2026, 6, 12);

      expect(service.getWeekStart(wednesday)).toEqual(new Date(2026, 6, 6));
      expect(service.getWeekStart(sunday)).toEqual(new Date(2026, 6, 6));
    });
  });

  describe('Gulf-cluster configuration (Friday/Saturday weekend, Sunday week start)', () => {
    beforeEach(() => setup({ weekendDays: ['Friday', 'Saturday'], weekStartDay: 'Sunday' }));

    it('treats Friday and Saturday as weekend', () => {
      expect(service.isWeekend(new Date(2026, 6, 10))).toBe(true); // Friday
      expect(service.isWeekend(new Date(2026, 6, 11))).toBe(true); // Saturday
    });

    it('does not treat Sunday as weekend', () => {
      expect(service.isWeekend(new Date(2026, 6, 12))).toBe(false); // Sunday
    });

    it('resolves week start to Sunday for any day in the week', () => {
      const wednesday = new Date(2026, 6, 8);
      const saturday = new Date(2026, 6, 11);

      expect(service.getWeekStart(wednesday)).toEqual(new Date(2026, 6, 5));
      expect(service.getWeekStart(saturday)).toEqual(new Date(2026, 6, 5));
    });
  });
});
