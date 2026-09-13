// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import {
  formatCalendarDate,
  localeDatePattern,
  localeNumericDatePattern,
} from './locale-date-format.helper';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

const SAMPLE_WIRE_VALUE = '2026-12-31';
const BUDDHIST_YEAR_OF_2026 = '2569';

describe('locale-date-format.helper', () => {
  let loader: LocaleDataLoaderService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(
      ['de', 'en', 'fr', 'ja', 'th', 'it', 'zh-CN'].map((code) => loader.ensureLoaded(code))
    );
  });

  it('should widen the two-digit year of the locale short pattern to four digits', () => {
    expect(localeNumericDatePattern('de')).toBe('dd.MM.yyyy');
    expect(localeNumericDatePattern('en')).toBe('M/d/yyyy');
    expect(localeNumericDatePattern('ja')).toBe('yyyy/MM/dd');
  });

  it.each([
    ['de', '31.12.2026'],
    ['en', '12/31/2026'],
    ['fr', '31/12/2026'],
    ['ja', '2026/12/31'],
    ['zh-CN', '2026/12/31'],
  ])('should format the same calendar date per locale (%s)', (locale, expected) => {
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, locale)).toBe(expected);
  });

  it('should never render a buddhist year for thai', () => {
    const formatted = formatCalendarDate(SAMPLE_WIRE_VALUE, 'th');

    expect(formatted).toBe('31/12/2026');
    expect(formatted).not.toContain(BUDDHIST_YEAR_OF_2026);
  });

  it('should render localized weekday names for the weekday style', () => {
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'fr', 'weekdayDate')).toBe('jeudi 31/12/2026');
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'it', 'weekdayDate')).toBe('giovedì 31/12/2026');
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'de', 'weekdayDate')).toBe('Donnerstag 31.12.2026');
  });

  it('should render a localized month and year for the monthYear style', () => {
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'de', 'monthYear')).toBe('Dezember 2026');
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'en', 'monthYear')).toBe('December 2026');
  });

  it('should put the year first in the monthYear style where the language does', () => {
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'ja', 'monthYear')).toBe('2026年12月');
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'zh-CN', 'monthYear')).toBe('2026年12月');
  });

  it('should keep a gregorian year in the monthYear style for thai', () => {
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'th', 'monthYear')).toContain('2026');
    expect(formatCalendarDate(SAMPLE_WIRE_VALUE, 'th', 'monthYear')).not.toContain(
      BUDDHIST_YEAR_OF_2026
    );
  });

  it('should expose the pattern used by every style', () => {
    expect(localeDatePattern('de', 'numericDate')).toBe('dd.MM.yyyy');
    expect(localeDatePattern('de', 'weekdayDate')).toBe('EEEE dd.MM.yyyy');
  });

  it('should return null for values that are not calendar dates', () => {
    expect(formatCalendarDate(null, 'de')).toBeNull();
    expect(formatCalendarDate(undefined, 'de')).toBeNull();
    expect(formatCalendarDate('not-a-date', 'de')).toBeNull();
  });

  describe.each(CALENDAR_TEST_ZONES)('in browser zone %s', (zone) => {
    useTimeZone(zone);

    it('should keep the calendar day of a UTC-midnight wire value', () => {
      expect(formatCalendarDate('2026-12-31T00:00:00Z', 'de')).toBe('31.12.2026');
    });
  });
});
