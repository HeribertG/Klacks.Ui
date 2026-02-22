// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Calendar component for weekly period selection in the schedule header.
 * Provides year and week number selection with counter controls.
 * Triggers schedule data refresh on period change.
 *
 * @relations
 * - Parent: ScheduleHeaderComponent
 * - Uses: DataManagementScheduleService for filter state
 * - Uses: AllScheduleStateService for state persistence
 * - Uses: CalendarUtilService for week calculations
 */
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { AllScheduleStateService } from '../../services/all-schedule-state.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';

export interface CalendarResetData {
  year: number;
  month?: number;
  week?: number;
}

@Component({
  selector: 'app-schedule-header-calendar-weekly',
  templateUrl: './schedule-header-calendar-weekly.component.html',
  styleUrls: ['./schedule-header-calendar-weekly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
})
export class ScheduleHeaderCalendarWeeklyComponent implements OnInit {
  @Output() resetData = new EventEmitter<CalendarResetData>();

  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);
  private calendarUtil = inject(CalendarUtilService);

  maxYear: number = new Date().getFullYear() + 30;
  weeks: number[] = [];

  get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
    this.updateWeeks();
  }

  get selectedWeek(): number {
    return this.dataManagementSchedule.workFilter.currentWeek ?? 1;
  }
  set selectedWeek(value: number) {
    this.dataManagementSchedule.workFilter.currentWeek = value;
  }

  ngOnInit(): void {
    this.updateWeeks();
    if (!this.dataManagementSchedule.workFilter.currentWeek) {
      this.dataManagementSchedule.workFilter.currentWeek = this.calendarUtil.getISO8601WeekNumber(new Date());
    }
    this.resetData.emit({
      year: this.currentYear,
      week: this.selectedWeek,
    });
  }

  private updateWeeks(): void {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    this.weeks = Array.from({ length: weeksInYear }, (_, i) => i + 1);
  }

  private getWeeksInYear(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const week = this.calendarUtil.getISO8601WeekNumber(dec31);
    return week === 1 ? 52 : week;
  }

  changeYear(event: number) {
    this.currentYear = event;
    this.dataService.holidayCollection.currentYear = this.currentYear;
    if (this.selectedWeek > this.weeks.length) {
      this.selectedWeek = this.weeks.length;
    }
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      year: this.currentYear,
      week: this.selectedWeek,
    });
  }

  onChangeWeek() {
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      year: this.currentYear,
      week: this.selectedWeek,
    });
  }
}
