// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  inject,
  OnInit,
  viewChild,
  signal,
  computed,
  effect,
  output,
} from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { CalendarSettingService } from 'src/app/presentation/workplace/absence-gantt/services/calendar-setting.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { AbsenceGanttAbsenceListComponent } from './absence-gantt-absence-list/absence-gantt-absence-list.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';

@Component({
  selector: 'app-absence-gantt-header',
  templateUrl: './absence-gantt-header.component.html',
  styleUrls: ['./absence-gantt-header.component.scss'],
  standalone: true,
  imports: [
    AbsenceGanttAbsenceListComponent,
    PdfIconComponent,
    NgbTooltipModule,
    NgxSliderModule,
    TranslateModule,
    CounterComponent,
  ],
})
export class AbsenceGanttHeaderComponent implements OnInit {
  absenceList = viewChild<AbsenceGanttAbsenceListComponent>('absenceList');

  // Event Emitter für PDF Export
  pdfExportRequested = output<void>();

  private calendarSetting = inject(CalendarSettingService);
  private holidayCollection = inject(HolidayCollectionService);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private translateService = inject(TranslateService);

  currentLang = signal<Language>(DomainMessages.DEFAULT_LANG);
  value = signal<number>(100);
  currentYear = signal<number>(new Date().getFullYear());

  maxYear = computed(() => this.currentYear() + 30);
  zoomLevel = computed(() => this.value() / 100);

  options = signal<Options>({
    floor: 50,
    ceil: 300,
    step: 10,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  });

  constructor() {
    effect(() => {
      this.calendarSetting.zoom = this.zoomLevel();
    });

    effect(() => {
      const year = this.currentYear();
      this.dataManagementBreak.breakFilter.currentYear = year;
      this.holidayCollection.currentYear = year;
      this.dataManagementBreak.readYear();
    });

    effect(() => {
      this.currentLang.set(this.translateService.currentLang as Language);
    });
  }

  ngOnInit(): void {
    this.currentLang.set(this.translateService.currentLang as Language);
  }

  changeYear(event: number) {
    this.currentYear.set(event);
  }

  onPdfExport() {
    this.pdfExportRequested.emit();
  }

  get currentYearValue() {
    return this.currentYear();
  }

  get maxYearValue() {
    return this.maxYear();
  }

  get sliderValue() {
    return this.value();
  }

  get sliderOptions() {
    return this.options();
  }

  async initAsync(): Promise<void> {
    const absenceListComponent = this.absenceList();
    if (absenceListComponent) {
      absenceListComponent.fillImageMap();
    }
  }
}
