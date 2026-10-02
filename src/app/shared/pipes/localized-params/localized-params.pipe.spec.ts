// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { LocalizedParamsPipe } from './localized-params.pipe';

const PARAMS = {
  holiday: 'Weihnachten',
  holidayI18n: JSON.stringify({ de: 'Weihnachten', en: 'Christmas Day', ja: 'クリスマス', 'zh-cn': '圣诞节' }),
};

describe('LocalizedParamsPipe', () => {
  let pipe: LocalizedParamsPipe;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [LocalizedParamsPipe],
    });
    pipe = TestBed.inject(LocalizedParamsPipe);
    translate = TestBed.inject(TranslateService);
  });

  it('names the holiday in the current language', () => {
    translate.use('ja');

    expect(pipe.transform(PARAMS)).toEqual({ holiday: 'クリスマス' });
  });

  it('re-resolves the same parameters after a language switch', () => {
    translate.use('ja');
    expect(pipe.transform(PARAMS)).toEqual({ holiday: 'クリスマス' });

    translate.use('zh-CN');
    expect(pipe.transform(PARAMS)).toEqual({ holiday: '圣诞节' });
  });

  it('returns the same object for parameters without a multilingual companion', () => {
    const params = { hours: '11' };

    expect(pipe.transform(params)).toBe(params);
  });

  describe('date parameters', () => {
    const EXPIRING_SOON = { qualificationId: 'q-1', validUntil: '2026-12-31' };

    beforeEach(async () => {
      await TestBed.inject(LocaleDataLoaderService).ensureLoaded('de');
    });

    it('formats the date without any multilingual companion present', () => {
      TestBed.inject(LocaleService).setLocale('de');

      expect(pipe.transform(EXPIRING_SOON)).toEqual({ qualificationId: 'q-1', validUntil: '31.12.2026' });
    });

    it('re-formats the same parameters after the locale changes', () => {
      const localeService = TestBed.inject(LocaleService);
      localeService.setLocale('de');
      expect(pipe.transform(EXPIRING_SOON)['validUntil']).toBe('31.12.2026');

      localeService.setLocale('en');
      expect(pipe.transform(EXPIRING_SOON)['validUntil']).toBe('12/31/2026');
    });

    it('returns the memoized object while parameters and locale stay the same', () => {
      TestBed.inject(LocaleService).setLocale('de');

      expect(pipe.transform(EXPIRING_SOON)).toBe(pipe.transform(EXPIRING_SOON));
    });

    it('resolves holiday names and dates in one pass', () => {
      translate.use('ja');
      TestBed.inject(LocaleService).setLocale('de');

      expect(pipe.transform({ ...PARAMS, dueDate: '2026-03-15' })).toEqual({
        holiday: 'クリスマス',
        dueDate: '15.03.2026',
      });
    });

    describe.each(CALENDAR_TEST_ZONES)('in browser zone %s', (zone) => {
      useTimeZone(zone);

      it('keeps the calendar day', () => {
        TestBed.inject(LocaleService).setLocale('de');

        expect(pipe.transform({ validUntil: '2026-12-31T00:00:00Z' })['validUntil']).toBe('31.12.2026');
      });
    });
  });

  it('returns an empty object for missing parameters', () => {
    expect(pipe.transform(undefined)).toEqual({});
  });
});
