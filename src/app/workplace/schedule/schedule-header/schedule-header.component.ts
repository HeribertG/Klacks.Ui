import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  NgbDropdown,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { DataManagementCalendarSelectionService } from 'src/app/data/management/data-management-calendar-selection.service';
import { CommonModule } from '@angular/common';
import { CalendarSelectorComponent } from 'src/app/shared/calendar-selector/calendar-selector.component';
import {
  CalendarResetData,
  ScheduleHeaderCalendarComponent,
} from './schedule-header-calendar/schedule-header-calendar.component';
import { FormsModule } from '@angular/forms';
import { ChooseCalendarComponent } from 'src/app/icons/choose-calendar.component';
import { GridSettingsService } from 'src/app/shared/grid/services/grid-settings.service';

@Component({
  selector: 'app-schedule-header',
  templateUrl: './schedule-header.component.html',
  styleUrls: ['./schedule-header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxSliderModule,
    NgbDropdownModule,
    TranslateModule,
    CalendarSelectorComponent,
    NgbTooltip,
    ChooseCalendarComponent,
    ScheduleHeaderCalendarComponent,
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

  public displayYear = '';
  public displayMonth = '';

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
    this.displayYear = data.currentYear.toString();
    this.displayMonth = this.gridSettingsService.monthsName[data.selectedMonth];
  }

  private emitZoomChange() {
    const zoomValue = parseFloat((this.value / 100).toFixed(1));
    this.zoomChange.emit(zoomValue);
  }
}
