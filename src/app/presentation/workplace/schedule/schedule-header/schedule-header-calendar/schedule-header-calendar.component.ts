import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AllScheduleStateService } from '../../services/all-schedule-state.service';

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
      selectedMonth: this.selectedMonth,
      currentYear: this.currentYear,
    });
  }
  changeYear(event: number) {
    this.currentYear = event;
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      selectedMonth: this.selectedMonth,
      currentYear: this.currentYear,
    });
  }

  onChangeMonth() {
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();

    this.resetData.emit({
      selectedMonth: this.selectedMonth,
      currentYear: this.currentYear,
    });
  }
}
