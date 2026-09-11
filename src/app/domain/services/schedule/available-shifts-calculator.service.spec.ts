// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { IShiftSchedule, ShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { IWorkFilter, WorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const DAY_VISIBLE_BEFORE = 2;
const DAY_VISIBLE_AFTER = 3;
const AUGUST_3_INDEX = 4;

function createShift(wireDate: string, engaged: number): IShiftSchedule {
  const shift = new ShiftSchedule();
  shift.shiftId = 'shift-1';
  shift.abbreviation = 'F';
  shift.date = wireDate as unknown as Date;
  shift.sumEmployees = 1;
  shift.quantity = 1;
  shift.engaged = engaged;
  return shift;
}

function createAugustFilter(): IWorkFilter {
  const filter = new WorkFilter();
  filter.currentYear = 2026;
  filter.currentMonth = 8;
  filter.paymentInterval = 2;
  return filter;
}

describe('AvailableShiftsCalculatorService', () => {
  let service: AvailableShiftsCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AvailableShiftsCalculatorService,
        { provide: CalendarUtilService, useValue: {} },
        {
          provide: DataManagementSettingsService,
          useValue: {
            appSettings: {
              workSettings: () => ({ dayVisibleBefore: DAY_VISIBLE_BEFORE, dayVisibleAfter: DAY_VISIBLE_AFTER }),
            },
          },
        },
      ],
    });
    service = TestBed.inject(AvailableShiftsCalculatorService);
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
        'lists a free shift dated %s under the 2026-08-03 column',
        (wireDate) => {
          service.calculate([createShift(wireDate, 0)], createAugustFilter());

          const byDay = service.availableShiftsByDay;
          expect(byDay.length).toBe(DAY_VISIBLE_BEFORE + 31 + DAY_VISIBLE_AFTER);
          expect(byDay[AUGUST_3_INDEX]).toEqual(['F']);
          expect(byDay[AUGUST_3_INDEX - 1]).toEqual([]);
        },
      );

      it('lists an overbooked shift dated with a DateOnly string under its own column', () => {
        service.calculate([createShift('2026-08-03', 2)], createAugustFilter());

        expect(service.overbookedShiftsByDay[AUGUST_3_INDEX]).toEqual(['F']);
        expect(service.availableShiftsByDay[AUGUST_3_INDEX]).toEqual([]);
      });
    });
  }
});
