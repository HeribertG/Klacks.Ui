import { Component } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-schedule-header-calendar',
  templateUrl: './schedule-header-calendar.component.html',
  styleUrls: ['./schedule-header-calendar.component.scss'],
  standalone: false,
})
export class ScheduleHeaderCalendarComponent {
  currentYear: number = new Date().getFullYear();
  maxYear: number = this.currentYear + 30;
  selectedMonth: number = new Date().getMonth();

  constructor(
    public gridSettingsService: GridSettingsService,
    private dataManagementSchedule: DataManagementScheduleService,
    private dataService: DataService
  ) {}

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
  }
}
