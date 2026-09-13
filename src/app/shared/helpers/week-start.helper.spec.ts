// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { resolveNgbFirstDayOfWeek, toNgbFirstDayOfWeek } from './week-start.helper';

const NGB_MONDAY = 1;
const NGB_SATURDAY = 6;
const NGB_SUNDAY = 7;

describe('week-start.helper', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(['de', 'en', 'ar'].map((code) => loader.ensureLoaded(code)));
  });

  it.each([
    [0, NGB_SUNDAY],
    [1, NGB_MONDAY],
    [6, NGB_SATURDAY],
  ])('should map the js weekday %i to the ngb weekday %i', (jsDay, expected) => {
    expect(toNgbFirstDayOfWeek(jsDay)).toBe(expected);
  });

  it.each([
    ['de', NGB_MONDAY],
    ['en', NGB_SUNDAY],
    ['ar', NGB_SATURDAY],
  ])('should fall back to the first weekday of %s when nothing is configured', (locale, expected) => {
    expect(resolveNgbFirstDayOfWeek(locale, null)).toBe(expected);
  });

  it('should prefer the configured week start over the locale default', () => {
    expect(resolveNgbFirstDayOfWeek('en', 1)).toBe(NGB_MONDAY);
    expect(resolveNgbFirstDayOfWeek('de', 0)).toBe(NGB_SUNDAY);
  });
});
