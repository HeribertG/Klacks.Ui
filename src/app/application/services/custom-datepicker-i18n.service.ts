// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { FormStyle, TranslationWidth, getLocaleDayNames, getLocaleMonthNames } from '@angular/common';
import { NgbDatepickerI18n, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { LocaleService } from './locale.service';

@Injectable()
export class CustomDatepickerI18n extends NgbDatepickerI18n {
  private localeService = inject(LocaleService);

  getWeekdayShortName(weekday: number): string {
    const locale = this.localeService.getLocale();
    const weekdays = getLocaleDayNames(locale, FormStyle.Standalone, TranslationWidth.Abbreviated);
    return weekdays[(weekday % 7)] as string;
  }

  getMonthShortName(month: number): string {
    const locale = this.localeService.getLocale();
    const months = getLocaleMonthNames(locale, FormStyle.Standalone, TranslationWidth.Abbreviated);
    return months[month - 1] as string;
  }

  getMonthFullName(month: number): string {
    return this.getMonthShortName(month);
  }

  getDayAriaLabel(date: NgbDateStruct): string {
    return `${date.day}-${date.month}-${date.year}`;
  }

  getWeekdayLabel(weekday: number): string {
    return this.getWeekdayShortName(weekday);
  }
}
