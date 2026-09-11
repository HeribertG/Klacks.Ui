// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompanyDateTimePipe } from './company-date-time.pipe';
import { setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('CompanyDateTimePipe', () => {
  let pipe: CompanyDateTimePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CompanyDateTimePipe, { provide: LOCALE_ID, useValue: 'en-US' }],
    });
    pipe = TestBed.inject(CompanyDateTimePipe);
  });

  afterEach(() => {
    setCompanyTimeZone(null);
  });

  it('returns null for null, undefined and unparsable values', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('not-a-date')).toBeNull();
  });

  describe('browser zone America/New_York', () => {
    useTimeZone('America/New_York');

    it('falls back to the browser zone when no company zone is set', () => {
      expect(pipe.transform('2026-06-27T23:30:00Z')).toBe('27.06.2026, 19:30');
    });

    it('shows the instant in Pacific/Auckland regardless of the browser zone', () => {
      setCompanyTimeZone('Pacific/Auckland');
      expect(pipe.transform('2026-06-27T23:30:00Z')).toBe('28.06.2026, 11:30');
    });

    it('shows the instant in Europe/Zurich regardless of the browser zone', () => {
      setCompanyTimeZone('Europe/Zurich');
      expect(pipe.transform('2026-06-27T23:30:00Z')).toBe('28.06.2026, 01:30');
    });

    it('formats a company-zone midnight as 00, not 24 (h23 hour cycle)', () => {
      setCompanyTimeZone('Pacific/Auckland');
      expect(pipe.transform('2026-01-14T11:00:00Z')).toBe('15.01.2026, 00:00');
    });

    it('accepts a Date instance directly', () => {
      setCompanyTimeZone('Europe/Zurich');
      expect(pipe.transform(new Date('2026-06-27T23:30:00Z'))).toBe('28.06.2026, 01:30');
    });

    it('reacts to the company zone changing after an earlier render (memo invalidation)', () => {
      const value = '2026-06-27T23:30:00Z';
      expect(pipe.transform(value)).toBe('27.06.2026, 19:30');
      setCompanyTimeZone('Pacific/Auckland');
      expect(pipe.transform(value)).toBe('28.06.2026, 11:30');
    });
  });

  describe('de locale', () => {
    useTimeZone('America/New_York');

    it('still pads a company-zone midnight as 00 under the de locale', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [CompanyDateTimePipe, { provide: LOCALE_ID, useValue: 'de' }],
      });
      const dePipe = TestBed.inject(CompanyDateTimePipe);

      setCompanyTimeZone('Pacific/Auckland');
      expect(dePipe.transform('2026-01-14T11:00:00Z')).toBe('15.01.2026, 00:00');
    });
  });

  describe('locales with a non-Gregorian calendar or non-Latin digits', () => {
    useTimeZone('America/New_York');

    const pipeFor = (locale: string): CompanyDateTimePipe => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [CompanyDateTimePipe, { provide: LOCALE_ID, useValue: locale }],
      });
      return TestBed.inject(CompanyDateTimePipe);
    };

    it('keeps the Gregorian year under the th locale (no Buddhist year 2569)', () => {
      setCompanyTimeZone('Europe/Zurich');
      expect(pipeFor('th').transform('2026-06-27T23:30:00Z')).toBe('28.06.2026, 01:30');
    });

    it('keeps Latin digits under the ar-EG locale', () => {
      setCompanyTimeZone('Europe/Zurich');
      expect(pipeFor('ar-EG').transform('2026-06-27T23:30:00Z')).toBe('28.06.2026, 01:30');
    });
  });
});
