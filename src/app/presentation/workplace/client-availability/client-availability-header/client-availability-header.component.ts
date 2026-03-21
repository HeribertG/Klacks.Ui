// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, DestroyRef, inject, Input, OnInit, output, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { HourGroupingMode } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { PeriodCalendarMonthlyComponent, PeriodResetData } from 'src/app/presentation/shared/period-calendar-monthly/period-calendar-monthly.component';
import { PeriodCalendarWeeklyComponent } from 'src/app/presentation/shared/period-calendar-weekly/period-calendar-weekly.component';
import { PeriodCalendarBiweeklyComponent } from 'src/app/presentation/shared/period-calendar-biweekly/period-calendar-biweekly.component';
import { IconAngleLeftComponent } from 'src/app/presentation/icons/icon-angle-left.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';

const GROUPING_LABEL_KEYS = [
  'client-availability.grouping.1h',
  'client-availability.grouping.2h',
  'client-availability.grouping.4h',
  'client-availability.grouping.am-pm',
  'client-availability.grouping.full-day',
];

@Component({
  selector: 'app-client-availability-header',
  templateUrl: './client-availability-header.component.html',
  styleUrls: ['./client-availability-header.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgxSliderModule,
    NgbDropdownModule,
    NgbTooltipModule,
    TranslateModule,
    PeriodCalendarMonthlyComponent,
    PeriodCalendarWeeklyComponent,
    PeriodCalendarBiweeklyComponent,
    IconAngleLeftComponent,
    IconAngleRightComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAvailabilityHeaderComponent implements OnInit {
  private settings = inject(AvailabilitySettingService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private gridSettingsService = inject(GridSettingsService);
  private calendarUtil = inject(CalendarUtilService);

  @Input() viewMode: PaymentInterval = PaymentInterval.Weekly;

  periodChanged = output<PeriodResetData>();

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentWeek = 1;

  groupingOptions: Options = {};

  ngOnInit(): void {
    this.currentWeek = this.calendarUtil.getISO8601WeekNumber(new Date());
    this.groupingOptions = this.buildGroupingOptions();

    const rebuildOptions = () => {
      this.groupingOptions = this.buildGroupingOptions();
    };

    this.translateService.onTranslationChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(rebuildOptions);

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(rebuildOptions);
  }

  private buildGroupingOptions(): Options {
    return {
      floor: 0,
      ceil: 4,
      step: 1,
      showSelectionBarEnd: false,
      showSelectionBar: false,
      translate: (value: number): string =>
        this.translateService.instant(GROUPING_LABEL_KEYS[value]),
    };
  }

  get hourGrouping(): number {
    return this.settings.hourGroupingMode();
  }

  set hourGrouping(value: number) {
    this.settings.hourGroupingMode.set(value as HourGroupingMode);
  }

  get displayPeriod(): string {
    const cw = this.translateService.instant('client-availability.calendar-week');
    switch (this.viewMode) {
      case PaymentInterval.Weekly:
        return `${cw} ${this.currentWeek}`;
      case PaymentInterval.Biweekly:
        return `${cw} ${this.currentWeek}-${Math.min(this.currentWeek + 1, this.getWeeksInYear(this.currentYear))}`;
      case PaymentInterval.Monthly:
      default:
        return this.translateService.instant(this.gridSettingsService.monthsName[this.currentMonth - 1]);
    }
  }

  get displayYear(): string {
    return this.currentYear.toString();
  }

  onCalendarReset(data: PeriodResetData): void {
    if (data.month !== undefined) {
      this.currentMonth = data.month;
    }
    if (data.week !== undefined) {
      this.currentWeek = data.week;
    }
    this.currentYear = data.year;
    this.emitPeriodChange();
  }

  goToPrevious(): void {
    switch (this.viewMode) {
      case PaymentInterval.Weekly:
        this.goToPreviousWeek();
        break;
      case PaymentInterval.Biweekly:
        this.goToPreviousBiweekly();
        break;
      case PaymentInterval.Monthly:
      default:
        this.goToPreviousMonth();
        break;
    }
  }

  goToNext(): void {
    switch (this.viewMode) {
      case PaymentInterval.Weekly:
        this.goToNextWeek();
        break;
      case PaymentInterval.Biweekly:
        this.goToNextBiweekly();
        break;
      case PaymentInterval.Monthly:
      default:
        this.goToNextMonth();
        break;
    }
  }

  readonly PaymentInterval = PaymentInterval;

  private goToPreviousMonth(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.emitPeriodChange();
  }

  private goToNextMonth(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.emitPeriodChange();
  }

  private goToPreviousWeek(): void {
    if (this.currentWeek === 1) {
      this.currentYear--;
      this.currentWeek = this.getWeeksInYear(this.currentYear);
    } else {
      this.currentWeek--;
    }
    this.emitPeriodChange();
  }

  private goToNextWeek(): void {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    if (this.currentWeek >= weeksInYear) {
      this.currentYear++;
      this.currentWeek = 1;
    } else {
      this.currentWeek++;
    }
    this.emitPeriodChange();
  }

  private goToPreviousBiweekly(): void {
    if (this.currentWeek <= 2) {
      this.currentYear--;
      const weeksInYear = this.getWeeksInYear(this.currentYear);
      this.currentWeek = weeksInYear % 2 === 1 ? weeksInYear : weeksInYear - 1;
    } else {
      this.currentWeek -= 2;
    }
    this.emitPeriodChange();
  }

  private goToNextBiweekly(): void {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    if (this.currentWeek + 2 > weeksInYear) {
      this.currentYear++;
      this.currentWeek = 1;
    } else {
      this.currentWeek += 2;
    }
    this.emitPeriodChange();
  }

  private getWeeksInYear(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const week = this.calendarUtil.getISO8601WeekNumber(dec31);
    return week === 1 ? 52 : week;
  }

  private emitPeriodChange(): void {
    switch (this.viewMode) {
      case PaymentInterval.Monthly:
        this.periodChanged.emit({
          year: this.currentYear,
          month: this.currentMonth,
        });
        break;
      case PaymentInterval.Weekly:
      case PaymentInterval.Biweekly:
        this.periodChanged.emit({
          year: this.currentYear,
          week: this.currentWeek,
        });
        break;
    }
  }
}
