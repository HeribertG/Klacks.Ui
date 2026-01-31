/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Calendar component for biweekly period selection in the schedule header.
 * Provides year selection and biweekly period dropdown (KW pairs).
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

export interface BiweeklyOption {
  startWeek: number;
  label: string;
}

@Component({
  selector: 'app-schedule-header-calendar-biweekly',
  templateUrl: './schedule-header-calendar-biweekly.component.html',
  styleUrls: ['./schedule-header-calendar-biweekly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
})
export class ScheduleHeaderCalendarBiweeklyComponent implements OnInit {
  @Output() resetData = new EventEmitter<CalendarResetData>();

  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);
  private calendarUtil = inject(CalendarUtilService);

  maxYear: number = new Date().getFullYear() + 30;
  biweeklyOptions: BiweeklyOption[] = [];

  get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
    this.updateBiweeklyOptions();
  }

  get selectedWeek(): number {
    return this.dataManagementSchedule.workFilter.currentWeek ?? 1;
  }
  set selectedWeek(value: number) {
    this.dataManagementSchedule.workFilter.currentWeek = value;
  }

  ngOnInit(): void {
    this.updateBiweeklyOptions();
    if (!this.dataManagementSchedule.workFilter.currentWeek) {
      const currentWeek = this.calendarUtil.getISO8601WeekNumber(new Date());
      this.dataManagementSchedule.workFilter.currentWeek = currentWeek % 2 === 1 ? currentWeek : currentWeek - 1;
    }
    this.resetData.emit({
      year: this.currentYear,
      week: this.selectedWeek,
    });
  }

  private updateBiweeklyOptions(): void {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    this.biweeklyOptions = [];
    for (let i = 1; i <= weeksInYear; i += 2) {
      const endWeek = Math.min(i + 1, weeksInYear);
      this.biweeklyOptions.push({
        startWeek: i,
        label: `${i} - ${endWeek}`,
      });
    }
  }

  private getWeeksInYear(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const week = this.calendarUtil.getISO8601WeekNumber(dec31);
    return week === 1 ? 52 : week;
  }

  changeYear(event: number) {
    this.currentYear = event;
    this.dataService.holidayCollection.currentYear = this.currentYear;
    const maxStartWeek = this.biweeklyOptions[this.biweeklyOptions.length - 1]?.startWeek ?? 1;
    if (this.selectedWeek > maxStartWeek) {
      this.selectedWeek = maxStartWeek;
    }
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      year: this.currentYear,
      week: this.selectedWeek,
    });
  }

  onChangeBiweekly() {
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      year: this.currentYear,
      week: this.selectedWeek,
    });
  }
}
