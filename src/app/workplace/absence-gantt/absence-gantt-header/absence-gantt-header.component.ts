import { Component, OnInit, ViewChild } from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import {
  NgbDropdown,
  NgbDropdownModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { DataManagementCalendarSelectionService } from 'src/app/data/management/data-management-calendar-selection.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ChooseCalendarComponent } from 'src/app/icons/choose-calendar.component';
import { AbsenceGanttAbsenceListComponent } from './absence-gantt-absence-list/absence-gantt-absence-list.component';
import { PdfIconComponent } from 'src/app/icons/pdf-icon.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { CalendarSelectorComponent } from 'src/app/shared/calendar-selector/calendar-selector.component';
import { CounterComponent } from 'src/app/shared/counter/counter.component';

@Component({
  selector: 'app-absence-gantt-header',
  templateUrl: './absence-gantt-header.component.html',
  styleUrls: ['./absence-gantt-header.component.scss'],
  standalone: true,
  imports: [
    AbsenceGanttAbsenceListComponent,
    PdfIconComponent,
    ChooseCalendarComponent,
    NgbDropdownModule,
    NgbTooltipModule,
    NgxSliderModule,
    TranslateModule,
    CalendarSelectorComponent,
    CounterComponent,
  ],
})
export class AbsenceGanttHeaderComponent implements OnInit {
  @ViewChild('dropdownSetting') dropdownSetting!: NgbDropdown;
  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  value: number = 100;

  options: Options = {
    floor: 50,
    ceil: 300,
    step: 10,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  };

  currentYear: number = new Date().getFullYear();
  maxYear: number = this.currentYear + 30;

  constructor(
    private calendarSetting: CalendarSettingService,
    private holidayCollection: HolidayCollectionService,
    private dataManagementBreak: DataManagementBreakService,
    private translateService: TranslateService,
    private dataManagementCalendarSelectionService: DataManagementCalendarSelectionService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.holidayCollection.readData();
  }

  onChange() {
    this.calendarSetting.zoom = this.value / 100;
  }

  changeYear(event: number) {
    this.dataManagementBreak.breakFilter.currentYear = event;
    this.holidayCollection.currentYear = event;
    this.dataManagementBreak.readYear();
  }

  onOpenMenu() {
    setTimeout(() => {
      this.dropdownSetting.open();
    }, 100);
  }

  onChangeCalendar() {
    setTimeout(() => {
      const chips = this.dataManagementCalendarSelectionService.chips;
      this.holidayCollection.setSelection(chips);
    }, 300);
  }

  onReRead() {
    this.onChangeCalendar();
  }
}
