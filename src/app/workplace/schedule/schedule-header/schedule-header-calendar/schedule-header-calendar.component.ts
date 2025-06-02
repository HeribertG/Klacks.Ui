import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/shared/counter/counter.component';

export interface CalendarResetData {
  selectedMonth: number;
  currentYear: number;
}

@Component({
  selector: 'app-schedule-header-calendar',
  templateUrl: './schedule-header-calendar.component.html',
  styleUrls: ['./schedule-header-calendar.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, CounterComponent],
})
export class ScheduleHeaderCalendarComponent implements OnInit {
  @Output() resetData = new EventEmitter<CalendarResetData>();

  public gridSettingsService = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(DataService);

  currentYear: number = new Date().getFullYear();
  maxYear: number = this.currentYear + 30;
  selectedMonth: number = new Date().getMonth();

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
}
