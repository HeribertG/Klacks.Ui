import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

export interface CalendarResetData {
  selectedMonth: number;
  currentYear: number;
}

@Component({
  selector: 'app-schedule-header-calendar',
  templateUrl: './schedule-header-calendar.component.html',
  styleUrls: ['./schedule-header-calendar.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent, NgbDropdownModule],
})
export class ScheduleHeaderCalendarComponent implements OnInit {
  @Output() resetData = new EventEmitter<CalendarResetData>();

  public gridSettingsService = inject(GridSettingsService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);

  currentYear: number = new Date().getFullYear();
  maxYear: number = this.currentYear + 30;
  selectedMonth: number = new Date().getMonth() + 1;

  ngOnInit(): void {
    this.resetData.emit({
      selectedMonth: this.selectedMonth,
      currentYear: this.currentYear,
    });
  }
  changeYear(event: number) {
    this.currentYear = event;
    this.dataManagementSchedule.workFilter.currentYear = this.currentYear;
    this.dataService.holidayCollection.currentYear = this.currentYear;
  }

  onChangeMonth() {
    this.dataManagementSchedule.workFilter.currentMonth = this.selectedMonth;
  }

  onClickReset() {
    this.dataManagementSchedule.workFilter.currentMonth = this.selectedMonth;
    this.dataManagementSchedule.workFilter.currentYear = this.currentYear;
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();

    this.resetData.emit({
      selectedMonth: this.selectedMonth,
      currentYear: this.currentYear,
    });
  }

  onShiftFilterChange() {
    this.dataManagementSchedule.readShiftSchedule();
  }

  clearShiftFilters() {
    this.dataManagementSchedule.shiftScheduleFilter.searchString = undefined;
    this.dataManagementSchedule.shiftScheduleFilter.isSporadic = undefined;
    this.dataManagementSchedule.shiftScheduleFilter.isTimeRange = undefined;
    this.dataManagementSchedule.shiftScheduleFilter.container = undefined;
    this.dataManagementSchedule.shiftScheduleFilter.isStandartShift = undefined;
    this.onShiftFilterChange();
  }
}
