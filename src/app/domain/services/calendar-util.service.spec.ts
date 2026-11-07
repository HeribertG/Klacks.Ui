// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CalendarUtilService } from './calendar-util.service';
import { WeekConfigurationService } from './settings/week-configuration.service';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { addDays, formatDateOnly } from 'src/app/domain/helpers/date.helper';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { ICalendarPeriod } from 'src/app/domain/models/calendar/calendar-period.interface';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const SUNDAY = 0;
const MONDAY = 1;
const SATURDAY = 6;

const day = (iso: string): Date => parseCalendarDate(iso) as Date;
const range = (period: ICalendarPeriod): string => `${formatDateOnly(period.start)}..${formatDateOnly(period.end)}`;

describe('CalendarUtilService biweekly pay period', () => {
  let service: CalendarUtilService;
  let weekStartDay: WritableSignal<number>;

  beforeEach(() => {
    weekStartDay = signal(MONDAY);
    TestBed.configureTestingModule({
      providers: [{ provide: WeekConfigurationService, useValue: { weekStartDay } }],
    });
    service = TestBed.inject(CalendarUtilService);
  });

  const formerIsoParityRule = (date: Date): string => {
    const weekStart = addDays(date, -((date.getDay() + 6) % 7));
    const isoWeek = service.getISO8601WeekNumber(date);
    const start = isoWeek % 2 === 0 ? addDays(weekStart, -7) : weekStart;
    return `${formatDateOnly(start)}..${formatDateOnly(addDays(start, 13))}`;
  };

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it.each([
        ['2025-07-15', '2025-07-14..2025-07-27'],
        ['2026-12-21', '2026-12-14..2026-12-27'],
        ['2026-12-28', '2026-12-28..2027-01-10'],
        ['2027-01-04', '2026-12-28..2027-01-10'],
        ['2027-01-10', '2026-12-28..2027-01-10'],
        ['2027-01-11', '2027-01-11..2027-01-24'],
      ])('Monday start: %s lies in %s (parity with the backend BiweeklyPayPeriodTests)', (date, expected) => {
        expect(range(service.getBiweeklyPeriod(day(date)))).toBe(expected);
      });

      it.each([
        ['2025-07-15', '2025-07-13..2025-07-26'],
        ['2026-12-21', '2026-12-13..2026-12-26'],
        ['2026-12-28', '2026-12-27..2027-01-09'],
        ['2027-01-04', '2026-12-27..2027-01-09'],
        ['2027-01-11', '2027-01-10..2027-01-23'],
      ])('Sunday start: %s lies in %s (parity with the backend BiweeklyPayPeriodTests)', (date, expected) => {
        weekStartDay.set(SUNDAY);

        expect(range(service.getBiweeklyPeriod(day(date)))).toBe(expected);
      });

      it('matches the former ISO-parity rule with a Monday start on every day from 2021-01-04 to 2027-01-03', () => {
        const mismatches: string[] = [];
        for (let date = day('2021-01-04'); date <= day('2027-01-03'); date = addDays(date, 1)) {
          const expected = formerIsoParityRule(date);
          const actual = range(service.getBiweeklyPeriod(date));
          if (actual !== expected) {
            mismatches.push(`${formatDateOnly(date)}: ${expected} vs ${actual}`);
          }
        }

        expect(mismatches).toEqual([]);
        expect(range(service.getBiweeklyPeriod(day('2027-01-04')))).not.toBe(formerIsoParityRule(day('2027-01-04')));
      });

      it.each([MONDAY, SUNDAY, SATURDAY])('week start %i: consecutive periods are contiguous and round-trip through the stored week', (startDay) => {
        weekStartDay.set(startDay);
        let previous = service.getBiweeklyPeriod(day('2026-01-01'));

        for (let date = day('2026-01-01'); date <= day('2028-12-31'); date = addDays(date, 1)) {
          const period = service.getBiweeklyPeriod(date);
          expect(period.start.getDay()).toBe(startDay);
          expect(period.start <= date && date <= period.end).toBe(true);

          const key = service.getWeekKeyForInterval(date, PaymentInterval.Biweekly);
          expect(range(service.getBiweeklyPeriodOfWeek(key.year, key.week))).toBe(range(period));

          if (range(period) !== range(previous)) {
            expect(formatDateOnly(period.start)).toBe(formatDateOnly(addDays(previous.end, 1)));
            previous = period;
          }
        }
      });

      it('steps 2026 W51 -> W53 -> 2027 W2 and back without overlap', () => {
        const forward = [service.getAdjacentBiweeklyStart(2026, 51, 1)];
        forward.push(service.getAdjacentBiweeklyStart(forward[0].year, forward[0].week, 1));
        const back = service.getAdjacentBiweeklyStart(forward[1].year, forward[1].week, -1);

        expect(forward).toEqual([{ year: 2026, week: 53 }, { year: 2027, week: 2 }]);
        expect(back).toEqual({ year: 2026, week: 53 });
        expect(range(service.getBiweeklyPeriodOfWeek(2026, 53))).toBe('2026-12-28..2027-01-10');
        expect(range(service.getBiweeklyPeriodOfWeek(2027, 2))).toBe('2027-01-11..2027-01-24');
      });

      it('maps a week stored by the former odd-week rule onto the period that contains it', () => {
        expect(service.getAdjacentBiweeklyStart(2027, 1, 1)).toEqual({ year: 2027, week: 2 });
        expect(service.getBiweeklyWeeks(2027, 1)).toEqual({ start: { year: 2026, week: 53 }, end: { year: 2027, week: 1 } });
      });
    });
  }

  describe('weekly pay period and ISO week count', () => {
    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it.each([
          [2015, 53],
          [2020, 53],
          [2026, 53],
          [2021, 52],
          [2025, 52],
          [2027, 52],
        ])('counts the ISO weeks of %i as %i', (year, weeks) => {
          expect(service.getIsoWeeksInYear(year)).toBe(weeks);
        });

        it.each([
          [MONDAY, '2026-12-27', '2026-12-21..2026-12-27'],
          [MONDAY, '2026-12-28', '2026-12-28..2027-01-03'],
          [SUNDAY, '2026-12-27', '2026-12-27..2027-01-02'],
          [SUNDAY, '2027-01-02', '2026-12-27..2027-01-02'],
          [SATURDAY, '2027-01-01', '2026-12-26..2027-01-01'],
        ])('week start %i: %s lies in the backend week %s (configured week start through +6 days)', (startDay, date, expected) => {
          weekStartDay.set(startDay);

          expect(range(service.getWeeklyPeriod(day(date)))).toBe(expected);
        });

        it.each([MONDAY, SUNDAY, SATURDAY])('week start %i: consecutive weeks are contiguous and round-trip through the stored week', (startDay) => {
          weekStartDay.set(startDay);
          let previous = service.getWeeklyPeriod(day('2026-01-01'));

          for (let date = day('2026-01-01'); date <= day('2028-12-31'); date = addDays(date, 1)) {
            const period = service.getWeeklyPeriod(date);
            expect(period.start.getDay()).toBe(startDay);
            expect(period.start <= date && date <= period.end).toBe(true);

            const key = service.getWeekKeyForInterval(date, PaymentInterval.Weekly);
            expect(range(service.getWeeklyPeriodOfWeek(key.year, key.week))).toBe(range(period));

            if (range(period) !== range(previous)) {
              expect(formatDateOnly(period.start)).toBe(formatDateOnly(addDays(previous.end, 1)));
              previous = period;
            }
          }
        });

        it('keeps the ISO Monday to Sunday week for the default Monday start', () => {
          expect(range(service.getWeeklyPeriodOfWeek(2026, 53))).toBe('2026-12-28..2027-01-03');
          expect(formatDateOnly(service.getWeeklyPeriodOfWeek(2026, 53).start)).toBe(formatDateOnly(service.getWeekStartDate(2026, 53)));
          expect(formatDateOnly(service.getWeeklyPeriodOfWeek(2026, 53).end)).toBe(formatDateOnly(service.getWeekEndDate(2026, 53)));
        });
      });
    }

    it('keys a Sunday-start weekly date by the Monday inside its configured week', () => {
      weekStartDay.set(SUNDAY);

      expect(service.getWeekKeyForInterval(day('2026-12-27'), PaymentInterval.Weekly)).toEqual({ year: 2026, week: 53 });
      expect(service.getWeekKeyForInterval(day('2027-01-02'), PaymentInterval.Weekly)).toEqual({ year: 2026, week: 53 });
      expect(service.getWeekKeyForInterval(day('2027-01-03'), PaymentInterval.Weekly)).toEqual({ year: 2027, week: 1 });
      expect(range(service.getWeeklyPeriodOfWeek(2026, 53))).toBe('2026-12-27..2027-01-02');
    });
  });

  it('lists the biweekly start weeks of a year from the rule', () => {
    const weeks2026 = service.getBiweeklyPeriodsOfYear(2026).map((weeks) => weeks.start.week);
    const weeks2027 = service.getBiweeklyPeriodsOfYear(2027).map((weeks) => weeks.start.week);

    expect(weeks2026[0]).toBe(1);
    expect(weeks2026[weeks2026.length - 1]).toBe(53);
    expect(weeks2026).toHaveLength(27);
    expect(weeks2027[0]).toBe(2);
    expect(weeks2027[weeks2027.length - 1]).toBe(52);
    expect(weeks2027).toHaveLength(26);
  });

  it('keys weekly and monthly dates by their ISO week and ISO week-year', () => {
    expect(service.getWeekKeyForInterval(day('2027-01-01'), PaymentInterval.Weekly)).toEqual({ year: 2026, week: 53 });
    expect(service.getWeekKeyForInterval(day('2025-12-29'), PaymentInterval.Monthly)).toEqual({ year: 2026, week: 1 });
    expect(service.getIsoWeekYear(day('2027-01-03'))).toBe(2026);
  });

  it('keys a Sunday-start biweekly date by the Monday inside the first week of its period', () => {
    weekStartDay.set(SUNDAY);

    expect(service.getWeekKeyForInterval(day('2026-12-27'), PaymentInterval.Biweekly)).toEqual({ year: 2026, week: 53 });
    expect(service.getWeekKeyForInterval(day('2027-01-09'), PaymentInterval.Biweekly)).toEqual({ year: 2026, week: 53 });
    expect(service.getWeekKeyForInterval(day('2027-01-10'), PaymentInterval.Biweekly)).toEqual({ year: 2027, week: 2 });
  });
});
