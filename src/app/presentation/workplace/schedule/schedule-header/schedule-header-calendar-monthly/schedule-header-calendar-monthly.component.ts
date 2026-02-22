// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Calendar component for monthly period selection in the schedule header.
 * Provides year and month selection with dropdown for month names.
 * Triggers schedule data refresh on period change.
 *
 * @relations
 * - Parent: ScheduleHeaderComponent
 * - Uses: DataManagementScheduleService for filter state
 * - Uses: AllScheduleStateService for state persistence
 * - Uses: GridSettingsService for month names
 */
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { AllScheduleStateService } from '../../services/all-schedule-state.service';

export interface CalendarResetData {
  year: number;
  month?: number;
  week?: number;
}

@Component({
  selector: 'app-schedule-header-calendar-monthly',
  templateUrl: './schedule-header-calendar-monthly.component.html',
  styleUrls: ['./schedule-header-calendar-monthly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
})
export class ScheduleHeaderCalendarMonthlyComponent implements OnInit {
  @Output() resetData = new EventEmitter<CalendarResetData>();

  public gridSettingsService = inject(GridSettingsService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);

  maxYear: number = new Date().getFullYear() + 30;

  get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
  }

  get selectedMonth(): number {
    return this.dataManagementSchedule.workFilter.currentMonth;
  }
  set selectedMonth(value: number) {
    this.dataManagementSchedule.workFilter.currentMonth = value;
  }

  ngOnInit(): void {
    this.resetData.emit({
      year: this.currentYear,
      month: this.selectedMonth,
    });
  }

  changeYear(event: number) {
    this.currentYear = event;
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      year: this.currentYear,
      month: this.selectedMonth,
    });
  }

  onChangeMonth() {
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      year: this.currentYear,
      month: this.selectedMonth,
    });
  }
}
