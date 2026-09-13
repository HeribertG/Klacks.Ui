// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgbDatepickerConfig } from '@ng-bootstrap/ng-bootstrap';

import { DatepickerWeekStartService } from './datepicker-week-start.service';
import { LocaleDataLoaderService } from './locale-data-loader.service';
import { LocaleService } from './locale.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';

const NGB_MONDAY = 1;
const NGB_SATURDAY = 6;
const NGB_SUNDAY = 7;

describe('DatepickerWeekStartService', () => {
  let config: NgbDatepickerConfig;
  let localeService: LocaleService;
  let configuredWeekStartDay: WritableSignal<number | null>;

  beforeEach(async () => {
    configuredWeekStartDay = signal<number | null>(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WeekConfigurationService,
          useValue: { configuredWeekStartDay },
        },
      ],
    });
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(['de', 'en', 'ar'].map((code) => loader.ensureLoaded(code)));
    localeService = TestBed.inject(LocaleService);
    config = TestBed.inject(NgbDatepickerConfig);
  });

  function activate(): void {
    TestBed.inject(DatepickerWeekStartService);
    TestBed.flushEffects();
  }

  it.each([
    ['de', NGB_MONDAY],
    ['en', NGB_SUNDAY],
    ['ar', NGB_SATURDAY],
  ])('should use the first weekday of %s when nothing is configured', (locale, expected) => {
    localeService.setLocale(locale);

    activate();

    expect(config.firstDayOfWeek).toBe(expected);
  });

  it('should let the admin configuration win over the language default', () => {
    configuredWeekStartDay.set(0);
    localeService.setLocale('de');

    activate();

    expect(config.firstDayOfWeek).toBe(NGB_SUNDAY);
  });

  it('should pick up a week start that only arrives after login', () => {
    localeService.setLocale('en');
    activate();
    expect(config.firstDayOfWeek).toBe(NGB_SUNDAY);

    configuredWeekStartDay.set(6);
    TestBed.flushEffects();

    expect(config.firstDayOfWeek).toBe(NGB_SATURDAY);
  });

  it('should follow a language switch at runtime', async () => {
    localeService.setLocale('de');
    activate();

    await localeService.switchLocale('en');
    TestBed.flushEffects();

    expect(config.firstDayOfWeek).toBe(NGB_SUNDAY);
  });
});
