// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  DateToString,
  DateToStringShort,
  dateWithUTCCorrection,
  daysBetweenDates,
} from './date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

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
      expect(result).toContain('15.03.2024');
      expect(result).toContain('Friday');
    });
  });

  describe('DateToStringShort', () => {
    it('should format date without weekday', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToStringShort(date, 'de');
      expect(result).toBe('15.03.2024');
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
