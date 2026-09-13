// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { CustomDatepickerI18n } from './custom-datepicker-i18n.service';
import { LocaleDataLoaderService, SUPPORTED_APP_LANGUAGES } from './locale-data-loader.service';
import { LocaleService } from './locale.service';

const FIRST_WEEKDAY = 1;
const FIRST_MONTH = 1;

describe('CustomDatepickerI18n', () => {
  let loader: LocaleDataLoaderService;
  let localeService: LocaleService;
  let service: CustomDatepickerI18n;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CustomDatepickerI18n] });
    loader = TestBed.inject(LocaleDataLoaderService);
    localeService = TestBed.inject(LocaleService);
    service = TestBed.inject(CustomDatepickerI18n);
  });

  it('should render weekday and month names for a plugin language', async () => {
    await localeService.switchLocale('th');

    expect(service.getWeekdayShortName(FIRST_WEEKDAY)).toBeTruthy();
    expect(service.getMonthShortName(FIRST_MONTH)).toBeTruthy();
  });

  it.each([...SUPPORTED_APP_LANGUAGES])('should not throw for %s', async (code) => {
    await loader.ensureLoaded(code);
    localeService.setLocale(code);

    expect(() => service.getWeekdayShortName(FIRST_WEEKDAY)).not.toThrow();
    expect(() => service.getMonthFullName(FIRST_MONTH)).not.toThrow();
  });
});
