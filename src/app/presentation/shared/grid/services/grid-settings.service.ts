// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

const WEEKDAY_KEYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTH_KEYS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

@Injectable({
  providedIn: 'root',
})
export class GridSettingsService {
  private translateService = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  weekday = new Array(7);
  monthsName = new Array(12);

  constructor() {
    this.updateLabels();
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.updateLabels());
  }

  private updateLabels(): void {
    const translatedWeekdays = this.translateService.instant(WEEKDAY_KEYS);
    const translatedMonths = this.translateService.instant(MONTH_KEYS);
    this.weekday = WEEKDAY_KEYS.map((key) => translatedWeekdays[key]);
    this.monthsName = MONTH_KEYS.map((key) => translatedMonths[key]);
  }

  destroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.monthsName = [];
    this.weekday = [];
  }
}
