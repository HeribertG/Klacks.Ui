// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Keeps the first day of week of every ngb datepicker in sync with the admin week configuration
 * and, when no week start is configured, with the active language: ngb's own default is Monday for
 * all 25 languages, which is wrong for English (Sunday) and Arabic (Saturday). Written from an
 * effect rather than once at bootstrap, because the app settings only arrive after login and the
 * language can be switched at runtime; datepickers read the config when they are created, so an
 * already open datepicker keeps the value it was built with.
 */

import { Injectable, effect, inject } from '@angular/core';
import { NgbDatepickerConfig } from '@ng-bootstrap/ng-bootstrap';

import { LocaleService } from './locale.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { resolveNgbFirstDayOfWeek } from 'src/app/shared/helpers/week-start.helper';

@Injectable({ providedIn: 'root' })
export class DatepickerWeekStartService {
  private datepickerConfig = inject(NgbDatepickerConfig);
  private localeService = inject(LocaleService);
  private weekConfiguration = inject(WeekConfigurationService);

  constructor() {
    effect(() => {
      this.datepickerConfig.firstDayOfWeek = resolveNgbFirstDayOfWeek(
        this.localeService.getLocale(),
        this.weekConfiguration.configuredWeekStartDay()
      );
    });
  }
}
