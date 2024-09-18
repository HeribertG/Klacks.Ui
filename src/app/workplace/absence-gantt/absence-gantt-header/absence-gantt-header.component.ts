import { Component, OnInit, ViewChild } from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementCalendarSelectionService } from 'src/app/data/management/data-management-calendar-selection.service';
import { TranslateService } from '@ngx-translate/core';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
  selector: 'app-absence-gantt-header',
  templateUrl: './absence-gantt-header.component.html',
  styleUrls: ['./absence-gantt-header.component.scss'],
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

  onReRead() {
    this.onChangeCalendar();
  }
}
