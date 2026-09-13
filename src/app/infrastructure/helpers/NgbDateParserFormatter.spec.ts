// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { NgbDateCustomParserFormatter } from './NgbDateParserFormatter';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

const NEW_YEARS_EVE = { year: 2026, month: 12, day: 31 };
const LAST_MONTH_OF_YEAR = 12;
const TEST_LANGUAGES = ['de', 'en', 'fr', 'ja', 'zh-CN', 'th', 'ar'];

describe('NgbDateCustomParserFormatter', () => {
  let formatter: NgbDateCustomParserFormatter;
  let localeService: LocaleService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [NgbDateCustomParserFormatter] });
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(TEST_LANGUAGES.map((code) => loader.ensureLoaded(code)));
    localeService = TestBed.inject(LocaleService);
    formatter = TestBed.inject(NgbDateCustomParserFormatter);
  });

  it.each([
    ['de', '31.12.2026'],
    ['en', '12/31/2026'],
    ['fr', '31/12/2026'],
    ['ja', '2026/12/31'],
    ['zh-CN', '2026/12/31'],
  ])('should parse the locale layout of %s', (locale, input) => {
    localeService.setLocale(locale);

    expect(formatter.parse(input)).toEqual(NEW_YEARS_EVE);
  });

  it.each([
    ['de', '31.12.2026'],
    ['en', '12/31/2026'],
    ['fr', '31/12/2026'],
    ['ja', '2026/12/31'],
  ])('should format back into the locale layout of %s', (locale, expected) => {
    localeService.setLocale(locale);

    expect(formatter.format(NEW_YEARS_EVE)).toBe(expected);
  });

  it('should accept any separator run and surrounding spaces in the locale field order', () => {
    localeService.setLocale('en');

    expect(formatter.parse('12.31.2026')).toEqual(NEW_YEARS_EVE);
    expect(formatter.parse(' 12 / 31 / 2026 ')).toEqual(NEW_YEARS_EVE);
  });

  it.each(['de', 'en', 'ja'])('should accept the ISO layout under %s as well', (locale) => {
    localeService.setLocale(locale);

    expect(formatter.parse('2026-12-31')).toEqual(NEW_YEARS_EVE);
    expect(formatter.parse('  2026-12-31  ')).toEqual(NEW_YEARS_EVE);
  });

  it('should not silently swap the fields of a swiss date typed under english', () => {
    localeService.setLocale('en');

    const parsed = formatter.parse('31.12.2026');

    expect(parsed).not.toEqual(NEW_YEARS_EVE);
    expect(parsed!.month).toBeGreaterThan(LAST_MONTH_OF_YEAR);
  });

  it('should reject a two-digit year instead of reading it as year 26', () => {
    localeService.setLocale('de');

    expect(formatter.parse('31.12.26')).toBeNull();
    expect(formatter.parse('31.12.202')).toBeNull();
  });

  it('should complete a day-and-month entry with the company year, in locale field order', () => {
    const currentYear = companyToday().getFullYear();

    localeService.setLocale('de');
    expect(formatter.parse('31.12')).toEqual({ year: currentYear, month: 12, day: 31 });

    localeService.setLocale('en');
    expect(formatter.parse('12/31')).toEqual({ year: currentYear, month: 12, day: 31 });

    localeService.setLocale('ja');
    expect(formatter.parse('12/31')).toEqual({ year: currentYear, month: 12, day: 31 });
  });

  it('should read a single number as a day of january of the company year', () => {
    localeService.setLocale('en');

    expect(formatter.parse('7')).toEqual({ year: companyToday().getFullYear(), month: 1, day: 7 });
  });

  it('should return null for empty and non numeric input and an empty string for no date', () => {
    localeService.setLocale('de');

    expect(formatter.parse('')).toBeNull();
    expect(formatter.parse('hello')).toBeNull();
    expect(formatter.format(null as never)).toBe('');
  });

  it.each(TEST_LANGUAGES)('should round-trip its own output for %s', async (locale) => {
    localeService.setLocale(locale);

    const formatted = formatter.format(NEW_YEARS_EVE);

    expect(formatter.parse(formatted)).toEqual(NEW_YEARS_EVE);
  });
});
