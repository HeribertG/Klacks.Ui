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

  public displayYear = '';
  public displayMonth = '';
  private selectedMonth = new Date().getMonth() + 1;
  private currentYear = new Date().getFullYear();

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

  onCalendarReset(data: CalendarResetData) {
    this.selectedMonth = data.selectedMonth;
    this.currentYear = data.currentYear;
    this.displayYear = data.currentYear.toString();
    this.displayMonth = this.gridSettingsService.monthsName[data.selectedMonth - 1];
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
    this.dataManagementSchedule.workFilter.currentMonth = this.selectedMonth;
    this.dataManagementSchedule.workFilter.currentYear = this.currentYear;
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();

    this.displayYear = this.currentYear.toString();
    this.displayMonth = this.gridSettingsService.monthsName[this.selectedMonth - 1];
  }

  private emitZoomChange() {
    const zoomValue = parseFloat((this.value / 100).toFixed(1));
    this.zoomChange.emit(zoomValue);
  }
}
