// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Period picker for biweekly pay periods: offers the real pay periods of the selected ISO year (from
 * CalendarUtilService, labelled with the ISO weeks of their first and second week, e.g. "53 - 1") and emits the ISO
 * year/week of the chosen period's start week. A week that is not a period start (stored by the former odd-week rule)
 * is snapped onto the period that contains it.
 * @param year - ISO week-year of the selected period
 * @param week - ISO week of the selected period; 0 or unset selects the period containing the company's today
 */
import {
  Component, inject, Input, OnInit,
  ChangeDetectionStrategy,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { BiweeklyOption } from './biweekly-option.interface';
import { PeriodResetData } from '../period-calendar-monthly/period-reset-data.interface';

@Component({
  selector: 'app-period-calendar-biweekly',
  templateUrl: './period-calendar-biweekly.component.html',
  styleUrls: ['./period-calendar-biweekly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCalendarBiweeklyComponent implements OnInit {
  @Input() year = companyToday().getFullYear();
  @Input() week = 1;
  readonly periodChanged = output<PeriodResetData>();

  private calendarUtil = inject(CalendarUtilService);

  maxYear = companyToday().getFullYear() + 30;
  biweeklyOptions: BiweeklyOption[] = [];

  ngOnInit(): void {
    const start = this.week
      ? this.calendarUtil.getBiweeklyWeeks(this.year, this.week).start
      : this.calendarUtil.getWeekKeyForInterval(companyToday(), PaymentInterval.Biweekly);
    this.year = start.year;
    this.week = start.week;
    this.updateBiweeklyOptions();
    this.periodChanged.emit({ year: this.year, week: this.week });
  }

  changeYear(event: number): void {
    this.year = event;
    this.updateBiweeklyOptions();
    const containing = [...this.biweeklyOptions].reverse().find((option) => option.startWeek <= this.week);
    this.week = (containing ?? this.biweeklyOptions[0])?.startWeek ?? this.week;
    this.emitChange();
  }

  onChangeBiweekly(): void {
    this.emitChange();
  }

  private updateBiweeklyOptions(): void {
    this.biweeklyOptions = this.calendarUtil.getBiweeklyPeriodsOfYear(this.year).map((weeks) => ({
      startWeek: weeks.start.week,
      label: `${weeks.start.week} - ${weeks.end.week}`,
    }));
  }

  private emitChange(): void {
    this.periodChanged.emit({ year: this.year, week: this.week });
  }
}
