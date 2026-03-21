// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, EventEmitter, inject, Input, OnInit, Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { PeriodResetData } from '../period-calendar-monthly/period-calendar-monthly.component';

export interface BiweeklyOption {
  startWeek: number;
  label: string;
}

@Component({
  selector: 'app-period-calendar-biweekly',
  templateUrl: './period-calendar-biweekly.component.html',
  styleUrls: ['./period-calendar-biweekly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCalendarBiweeklyComponent implements OnInit {
  @Input() year = new Date().getFullYear();
  @Input() week = 1;
  @Output() periodChanged = new EventEmitter<PeriodResetData>();

  private calendarUtil = inject(CalendarUtilService);

  maxYear = new Date().getFullYear() + 30;
  biweeklyOptions: BiweeklyOption[] = [];

  ngOnInit(): void {
    this.updateBiweeklyOptions();
    if (!this.week) {
      const currentWeek = this.calendarUtil.getISO8601WeekNumber(new Date());
      this.week = currentWeek % 2 === 1 ? currentWeek : currentWeek - 1;
    }
    this.periodChanged.emit({ year: this.year, week: this.week });
  }

  changeYear(event: number): void {
    this.year = event;
    this.updateBiweeklyOptions();
    const maxStartWeek = this.biweeklyOptions[this.biweeklyOptions.length - 1]?.startWeek ?? 1;
    if (this.week > maxStartWeek) {
      this.week = maxStartWeek;
    }
    this.emitChange();
  }

  onChangeBiweekly(): void {
    this.emitChange();
  }

  private updateBiweeklyOptions(): void {
    const weeksInYear = this.getWeeksInYear(this.year);
    this.biweeklyOptions = [];
    for (let i = 1; i <= weeksInYear; i += 2) {
      const endWeek = Math.min(i + 1, weeksInYear);
      this.biweeklyOptions.push({ startWeek: i, label: `${i} - ${endWeek}` });
    }
  }

  private getWeeksInYear(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const week = this.calendarUtil.getISO8601WeekNumber(dec31);
    return week === 1 ? 52 : week;
  }

  private emitChange(): void {
    this.periodChanged.emit({ year: this.year, week: this.week });
  }
}
