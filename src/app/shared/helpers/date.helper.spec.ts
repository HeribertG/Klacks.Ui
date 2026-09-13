// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  addDays,
  CalendarDateToStringShort,
  DateToString,
  DateToStringShort,
  getDateKeysBetween,
  dateWithUTCCorrection,
  daysBetweenDates,
} from './date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEn from '@angular/common/locales/en';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import localeTh from '@angular/common/locales/th';

registerLocaleData(localeDe, 'de');
registerLocaleData(localeEn, 'en');
registerLocaleData(localeFr, 'fr');
registerLocaleData(localeIt, 'it');
registerLocaleData(localeTh, 'th');

describe('Date Helper Functions', () => {
  describe('DateToString', () => {
    it('should format date with full weekday name (German)', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToString(date, 'de');
      expect(result).toContain('15.03.2024');
      expect(result).toContain('Freitag');
    });

    it('should format date with full weekday name (English)', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToString(date, 'en');
      expect(result).toContain('3/15/2024');
      expect(result).toContain('Friday');
    });

    it('should use french weekday names, not english ones', () => {
      const date = new Date('2024-03-15T00:00:00');

      expect(DateToString(date, 'fr')).toBe('vendredi 15/03/2024');
    });

    it('should use italian weekday names, not english ones', () => {
      const date = new Date('2024-03-15T00:00:00');

      expect(DateToString(date, 'it')).toBe('venerdì 15/03/2024');
    });

    it('should use thai weekday names and a gregorian year', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToString(date, 'th');

      expect(result).toContain('15/3/2024');
      expect(result).not.toContain('2567');
    });
  });

  describe('DateToStringShort', () => {
    it('should format date without weekday', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToStringShort(date, 'de');
      expect(result).toBe('15.03.2024');
    });
  });

  describe('tolerance for backend strings typed as Date', () => {
    it('addDays still returns a valid Date instead of throwing', () => {
      const call = () => addDays('2026-08-03T00:00:00Z' as unknown as Date, 1);

      expect(call).not.toThrow();
      expect(Number.isNaN(call().getTime())).toBe(false);
    });

    it('getDateKeysBetween still accepts a string start', () => {
      expect(getDateKeysBetween('2026-08-03T12:00:00Z' as unknown as Date, new Date(2026, 7, 5, 23)).length).toBeGreaterThan(0);
    });
  });

  describe('calendar dates across browser time zones', () => {
    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('activates the configured zone', () => {
          expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
        });

        it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
          'corrects the backend value %s to UTC midnight of its own day',
          (wireValue) => {
            expect(dateWithUTCCorrection(wireValue)?.toISOString()).toBe('2026-08-03T00:00:00.000Z');
          },
        );

        it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
          'formats the backend value %s as its own day',
          (wireValue) => {
            expect(CalendarDateToStringShort(wireValue, 'de')).toBe('03.08.2026');
          },
        );

        it('returns a value that is not a calendar date unchanged', () => {
          expect(CalendarDateToStringShort('not-a-date', 'de')).toBe('not-a-date');
        });

        it('corrects a local Date to UTC midnight of its local day', () => {
          expect(dateWithUTCCorrection(new Date(2026, 7, 3))?.toISOString()).toBe('2026-08-03T00:00:00.000Z');
        });

        it('counts days between a local grid start and a UTC-midnight backend string', () => {
          const gridStart = new Date(2026, 0, 1);
          const breakFrom = '2026-01-10T00:00:00Z' as unknown as Date;
          expect(daysBetweenDates(gridStart, breakFrom)).toBe(9);
        });
      });
    }
  });
});
