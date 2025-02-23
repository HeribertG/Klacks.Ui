import { Component, OnInit, ViewChild } from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { TranslateService } from '@ngx-translate/core';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementCalendarSelectionService } from 'src/app/data/management/data-management-calendar-selection.service';
import { SettingsService } from '../services/settings.service';

@Component({
    selector: 'app-schedule-header',
    templateUrl: './schedule-header.component.html',
    styleUrls: ['./schedule-header.component.scss'],
    standalone: false
})
export class ScheduleHeaderComponent implements OnInit {
  @ViewChild('dropdownSetting') dropdownSetting!: NgbDropdown;
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
    private holidayCollection: HolidayCollectionService,
    private dataManagementCalendarSelectionService: DataManagementCalendarSelectionService,
    private settings: SettingsService
  ) {}

  ngOnInit(): void {
    this.settings.zoom = parseFloat((this.value / 100).toFixed(1));
  }

  onChange() {
    this.settings.zoom = parseFloat((this.value / 100).toFixed(1));
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

  private readYear() {
    this.currentYear = this.holidayCollection.currentYear;
  }
}
