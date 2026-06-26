// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, inject, Input, OnInit,
  ChangeDetectionStrategy,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { PeriodResetData } from '../period-calendar-monthly/period-calendar-monthly.component';

@Component({
  selector: 'app-period-calendar-weekly',
  templateUrl: './period-calendar-weekly.component.html',
  styleUrls: ['./period-calendar-weekly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCalendarWeeklyComponent implements OnInit {
  @Input() year = new Date().getFullYear();
  @Input() week = 1;
  readonly periodChanged = output<PeriodResetData>();

  private calendarUtil = inject(CalendarUtilService);

  maxYear = new Date().getFullYear() + 30;
  weeks: number[] = [];

  ngOnInit(): void {
    this.updateWeeks();
    if (!this.week) {
      this.week = this.calendarUtil.getISO8601WeekNumber(new Date());
    }
    this.periodChanged.emit({ year: this.year, week: this.week });
  }

  changeYear(event: number): void {
    this.year = event;
    this.updateWeeks();
    if (this.week > this.weeks.length) {
      this.week = this.weeks.length;
    }
    this.emitChange();
  }

  onChangeWeek(): void {
    this.emitChange();
  }

  private updateWeeks(): void {
    const weeksInYear = this.getWeeksInYear(this.year);
    this.weeks = Array.from({ length: weeksInYear }, (_, i) => i + 1);
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
