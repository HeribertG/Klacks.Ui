// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  calendarDateKey,
  companyTimeZone,
  companyToday,
  isSameCalendarDate,
  parseCalendarDate,
  setCompanyTimeZone,
  toCalendarDateWire,
} from './calendar-date.helper';
import { formatDateOnly } from './date.helper';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

const ZONES = ['Europe/Zurich', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'] as const;

const ZONE_OFFSET_PROBE_MINUTES: Record<(typeof ZONES)[number], number> = {
  'Europe/Zurich': -60,
  'America/New_York': 300,
  'Asia/Kolkata': -330,
  'Pacific/Auckland': -780,
};

const DST_TRANSITION_DATES = [
  '2026-03-29',
  '2026-10-25',
  '2026-03-08',
  '2026-11-01',
  '2026-04-05',
  '2026-09-27',
];

const wireFormatsFor = (dateOnly: string): string[] => [
  dateOnly,
  `${dateOnly}T00:00:00Z`,
  `${dateOnly}T00:00:00`,
];

describe('calendar-date.helper', () => {
  for (const zone of ZONES) {
    describe(`in ${zone}`, () => {
      let originalTz: string | undefined;

      beforeEach(() => {
        originalTz = currentTimeZone();
        process.env['TZ'] = zone;
      });

      afterEach(() => {
        process.env['TZ'] = originalTz;
        setCompanyTimeZone(null);
      });

      it('activates the configured zone', () => {
        expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(ZONE_OFFSET_PROBE_MINUTES[zone]);
      });

      it.each(DST_TRANSITION_DATES)('round-trips %s through all three wire formats', (dateOnly) => {
        for (const wireValue of wireFormatsFor(dateOnly)) {
          const parsed = parseCalendarDate(wireValue);
          expect(parsed).not.toBeNull();
          expect(formatDateOnly(parsed as Date)).toBe(dateOnly);
        }
      });

      it.each(DST_TRANSITION_DATES)('sends %s as UTC midnight regardless of the browser zone', (dateOnly) => {
        const parsed = parseCalendarDate(dateOnly) as Date;
        expect(toCalendarDateWire(parsed)).toBe(`${dateOnly}T00:00:00.000Z`);
      });

      it.each(DST_TRANSITION_DATES)('sends raw wire strings of %s back unchanged in day', (dateOnly) => {
        for (const wireValue of wireFormatsFor(dateOnly)) {
          expect(toCalendarDateWire(wireValue)).toBe(`${dateOnly}T00:00:00.000Z`);
        }
      });

      it.each(DST_TRANSITION_DATES)('keys %s identically for all three wire formats', (dateOnly) => {
        for (const wireValue of wireFormatsFor(dateOnly)) {
          expect(calendarDateKey(wireValue)).toBe(dateOnly);
        }
        expect(calendarDateKey(parseCalendarDate(dateOnly))).toBe(dateOnly);
      });

      it('treats a DateOnly string and the local grid date of the same day as the same day', () => {
        const gridDate = new Date(2026, 7, 3);
        expect(isSameCalendarDate('2026-08-03', gridDate)).toBe(true);
        expect(isSameCalendarDate('2026-08-03T00:00:00Z', gridDate)).toBe(true);
        expect(isSameCalendarDate('2026-08-04', gridDate)).toBe(false);
      });

      it('parses a Date input component-wise instead of by instant', () => {
        const source = new Date(2026, 5, 15, 23, 30, 0);
        const parsed = parseCalendarDate(source);
        expect(parsed?.getFullYear()).toBe(2026);
        expect(parsed?.getMonth()).toBe(5);
        expect(parsed?.getDate()).toBe(15);
        expect(parsed?.getHours()).toBe(0);
      });
    });
  }

  describe('invalid input', () => {
    it('returns null for null and undefined', () => {
      expect(parseCalendarDate(null)).toBeNull();
      expect(parseCalendarDate(undefined)).toBeNull();
    });

    it('returns null for a garbage string', () => {
      expect(parseCalendarDate('not-a-date')).toBeNull();
    });

    it('returns null for an out-of-range calendar day', () => {
      expect(parseCalendarDate('2026-02-30')).toBeNull();
    });

    it('returns null for an invalid Date instance', () => {
      expect(parseCalendarDate(new Date('invalid'))).toBeNull();
    });

    it('refuses to send an unparsable calendar date', () => {
      expect(() => toCalendarDateWire('not-a-date')).toThrow(RangeError);
      expect(() => toCalendarDateWire(new Date('invalid'))).toThrow(RangeError);
    });

    it('returns an empty key and no same-day match for unparsable values', () => {
      expect(calendarDateKey(null)).toBe('');
      expect(calendarDateKey('not-a-date')).toBe('');
      expect(isSameCalendarDate(null, null)).toBe(false);
      expect(isSameCalendarDate('not-a-date', 'not-a-date')).toBe(false);
    });
  });

  describe('companyToday', () => {
    let originalTz: string | undefined;

    beforeEach(() => {
      originalTz = currentTimeZone();
      process.env['TZ'] = 'America/New_York';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      setCompanyTimeZone(null);
      process.env['TZ'] = originalTz;
    });

    it('falls back to the browser zone when no company zone is set', () => {
      vi.setSystemTime(new Date('2026-01-15T02:00:00Z'));
      expect(formatDateOnly(companyToday())).toBe('2026-01-14');
    });

    it('uses the company zone instead of the browser zone', () => {
      vi.setSystemTime(new Date('2026-01-15T02:00:00Z'));
      setCompanyTimeZone('Pacific/Auckland');
      expect(formatDateOnly(companyToday())).toBe('2026-01-15');
    });
  });

  describe('setCompanyTimeZone', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      setCompanyTimeZone(null);
      warnSpy.mockRestore();
    });

    it('rejects a Windows time zone id with a warning and falls back to the browser zone', () => {
      setCompanyTimeZone('Europe/Zurich');

      setCompanyTimeZone('W. Europe Standard Time');

      expect(companyTimeZone()).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(() => companyToday()).not.toThrow();
    });

    it('accepts a valid IANA id without a warning', () => {
      setCompanyTimeZone('America/New_York');

      expect(companyTimeZone()).toBe('America/New_York');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('clears the zone silently for null', () => {
      setCompanyTimeZone('America/New_York');

      setCompanyTimeZone(null);

      expect(companyTimeZone()).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
