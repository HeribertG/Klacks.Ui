// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { DatePipe } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CalendarDatePipe } from './calendar-date.pipe';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const DISPLAY_FORMAT = 'dd.MM.yyyy';

describe('CalendarDatePipe', () => {
  let pipe: CalendarDatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalendarDatePipe, { provide: LOCALE_ID, useValue: 'en-US' }],
    });
    pipe = TestBed.inject(CalendarDatePipe);
  });

  it('returns null for null, undefined and unparsable values', () => {
    expect(pipe.transform(null, DISPLAY_FORMAT)).toBeNull();
    expect(pipe.transform(undefined, DISPLAY_FORMAT)).toBeNull();
    expect(pipe.transform('not-a-date', DISPLAY_FORMAT)).toBeNull();
  });

  describe('why the plain DatePipe is not enough', () => {
    useTimeZone('America/New_York');

    it('shows the previous day for a UTC-midnight value west of UTC', () => {
      const datePipe = new DatePipe('en-US');
      expect(datePipe.transform('2026-08-03T00:00:00Z', DISPLAY_FORMAT)).toBe('02.08.2026');
      expect(pipe.transform('2026-08-03T00:00:00Z', DISPLAY_FORMAT)).toBe('03.08.2026');
    });
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
        'shows %s as 03.08.2026',
        (wireValue) => {
          expect(pipe.transform(wireValue, DISPLAY_FORMAT)).toBe('03.08.2026');
        },
      );

      it('shows a local-midnight Date on its own day', () => {
        expect(pipe.transform(new Date(2026, 7, 3), DISPLAY_FORMAT)).toBe('03.08.2026');
      });

      it('matches the plain DatePipe for DateOnly strings, which Angular already parses locally', () => {
        const datePipe = new DatePipe('en-US');
        expect(pipe.transform('2026-08-03', DISPLAY_FORMAT)).toBe(datePipe.transform('2026-08-03', DISPLAY_FORMAT));
      });
    });
  }
});
