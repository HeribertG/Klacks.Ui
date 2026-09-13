// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import {
  FormStyle,
  TranslationWidth,
  formatDate,
  getLocaleDayNames,
  getLocaleMonthNames,
} from '@angular/common';

import { LocaleDataLoaderService, SUPPORTED_APP_LANGUAGES } from './locale-data-loader.service';

const EXPECTED_DAY_COUNT = 7;
const EXPECTED_MONTH_COUNT = 12;
const SAMPLE_DATE = new Date(2026, 8, 12);

describe('LocaleDataLoaderService', () => {
  let loader: LocaleDataLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    loader = TestBed.inject(LocaleDataLoaderService);
  });

  it('should cover all 25 application languages', () => {
    expect(SUPPORTED_APP_LANGUAGES.length).toBe(25);
    expect(SUPPORTED_APP_LANGUAGES).toContain('zh-CN');
    expect(SUPPORTED_APP_LANGUAGES).toContain('zh-TW');
  });

  it.each([...SUPPORTED_APP_LANGUAGES])(
    'should register usable Angular locale data for %s',
    async (code) => {
      await loader.ensureLoaded(code);

      const days = getLocaleDayNames(code, FormStyle.Standalone, TranslationWidth.Abbreviated);
      const months = getLocaleMonthNames(code, FormStyle.Standalone, TranslationWidth.Abbreviated);

      expect(days.length).toBe(EXPECTED_DAY_COUNT);
      expect(months.length).toBe(EXPECTED_MONTH_COUNT);
      expect(() => formatDate(SAMPLE_DATE, 'shortDate', code)).not.toThrow();
    }
  );

  it('should also register the native Angular locale id for chinese variants', async () => {
    await loader.ensureLoaded('zh-CN');
    await loader.ensureLoaded('zh-TW');

    expect(() => formatDate(SAMPLE_DATE, 'shortDate', 'zh-Hans')).not.toThrow();
    expect(() => formatDate(SAMPLE_DATE, 'shortDate', 'zh-Hant')).not.toThrow();
  });

  it('should be idempotent and resolve for unknown codes without throwing', async () => {
    await loader.ensureLoaded('es');
    await loader.ensureLoaded('es');

    expect(loader.isLoaded('es')).toBe(true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(loader.ensureLoaded('xx')).resolves.toBeUndefined();
    expect(loader.isLoaded('xx')).toBe(false);
    warnSpy.mockRestore();
  });

  it('should warn when no locale data mapping exists for a code', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await loader.ensureLoaded('xx-YY');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('xx-YY'));
    warnSpy.mockRestore();
  });

  it('should not start a second import for concurrent calls', async () => {
    await Promise.all([loader.ensureLoaded('th'), loader.ensureLoaded('th'), loader.ensureLoaded('th')]);

    expect(loader.isLoaded('th')).toBe(true);
  });
});
