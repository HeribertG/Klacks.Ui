import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  NgbDropdown,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';

import { CalendarSelectorComponent } from 'src/app/presentation/shared/calendar-selector/calendar-selector.component';
import {
  CalendarResetData,
  ScheduleHeaderCalendarComponent,
} from './schedule-header-calendar/schedule-header-calendar.component';
import { FormsModule } from '@angular/forms';
import { ChooseCalendarComponent } from 'src/app/presentation/icons/choose-calendar.component';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { IconAngleLeftComponent } from 'src/app/presentation/icons/icon-angle-left.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';

@Component({
  selector: 'app-schedule-header',
  templateUrl: './schedule-header.component.html',
  styleUrls: ['./schedule-header.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgxSliderModule,
    NgbDropdownModule,
    TranslateModule,
    CalendarSelectorComponent,
    NgbTooltip,
    ChooseCalendarComponent,
    ScheduleHeaderCalendarComponent,
    IconAngleLeftComponent,
    IconAngleRightComponent,
],
  providers: [],
})
export class ScheduleHeaderComponent implements OnInit {
  @ViewChild('dropdownSetting') dropdownSetting!: NgbDropdown;
  value = 100;
  options: Options = {
    floor: 50,
    ceil: 300,
    step: 10,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  };

  @Output() zoomChange = new EventEmitter<number>();

  private holidayCollection = inject(HolidayCollectionService);
  private dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );
  private gridSettingsService = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);

  get displayYear(): string {
    return this.dataManagementSchedule.workFilter.currentYear.toString();
  }

  get displayMonth(): string {
    return this.gridSettingsService.monthsName[this.dataManagementSchedule.workFilter.currentMonth - 1];
  }

  private get selectedMonth(): number {
    return this.dataManagementSchedule.workFilter.currentMonth;
  }
  private set selectedMonth(value: number) {
    this.dataManagementSchedule.workFilter.currentMonth = value;
  }

  private get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  private set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
  }

  ngOnInit(): void {
    this.emitZoomChange();
  }

  onChange() {
    this.emitZoomChange();
  }

  changeYear(event: number) {
    this.holidayCollection.currentYear = event;
  }

  onOpenMenu() {
    setTimeout(() => {
      this.dropdownSetting.open();
    }, 100);
  }

  onChangeCalendar() {
    const chips = this.dataManagementCalendarSelectionService.chips;
    this.holidayCollection.setSelection(chips);
  }

  onCalendarReset(_data: CalendarResetData) {
  }

  goToPreviousMonth() {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.currentYear--;
    } else {
      this.selectedMonth--;
    }
    this.applyMonthChange();
  }

  goToNextMonth() {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.currentYear++;
    } else {
      this.selectedMonth++;
    }
    this.applyMonthChange();
  }

  private applyMonthChange() {
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();
  }

  private emitZoomChange() {
    const zoomValue = parseFloat((this.value / 100).toFixed(1));
    this.zoomChange.emit(zoomValue);
  }
}
