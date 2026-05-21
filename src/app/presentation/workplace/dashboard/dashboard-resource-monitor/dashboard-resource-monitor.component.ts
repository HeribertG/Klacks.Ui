// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full-width dashboard card showing daily workforce headcount as a Resource Histogram.
 * 365 daily stacked bars (green = services count, gray = absent employees) with
 * two reference lines: pink dotted (Wunsch-Einsatzbereitschaft) + red dashed (Max-Einsatzbereitschaft).
 * @param dataDashboardService - Provides resource monitor data
 */
import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { lastValueFrom } from 'rxjs';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import { IMonthMarker, IReferenceLine, ISpecialDay, SpecialDayType, StackedBarChartComponent } from 'src/app/presentation/shared/stacked-bar-chart/stacked-bar-chart.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { NgClass } from '@angular/common';

type TabId = 'chart' | 'manual';

const WUNSCH_COLOR = '#e91e63';
const WUNSCH_DASH = '1,3';
const MAX_COLOR = '#e74c3c';
const MAX_DASH = '6,3';
const TOTAL_COLOR = '#1976d2';
const TOTAL_DASH = '0';
const LINE_STROKE_WIDTH = 1.5;

@Component({
  selector: 'app-dashboard-resource-monitor',
  templateUrl: './dashboard-resource-monitor.component.html',
  styleUrls: ['./dashboard-resource-monitor.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgClass, NgxSliderModule, NgbTooltipModule, CounterComponent, GroupSelectComponent, StackedBarChartComponent],
  providers: [HolidayCollectionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardResourceMonitorComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);
  private appSettings = inject(AppSettingsManagementService);
  private gridColorService = inject(GridColorService);
  private holidayCollection = inject(HolidayCollectionService);
  private manualLoader = inject(ManualLoaderService);
  private translate = inject(TranslateService);

  selectedYear = signal(new Date().getFullYear());
  selectedGroupId = signal<string | null>(null);
  private currentLang = signal(this.translate.currentLang ?? 'de');
  isLoading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<TabId>('chart');
  manualContent = signal<string>('');
  zoom = signal<number>(100);
  readonly zoomOptions: Options = {
    floor: 100,
    ceil: 400,
    step: 10,
    showSelectionBar: false,
    showSelectionBarEnd: false,
    hideLimitLabels: true,
    hidePointerLabels: true,
  };

  private dailyData = signal([] as { date: string; dienstCount: number; absenzCount: number; wunschCount: number; maxCount: number; totalCount: number }[]);

  maxYear = computed(() => this.selectedYear() + 30);

  dienstByDay = computed(() => this.dailyData().map(d => d.dienstCount));
  absenzByDay = computed(() => this.dailyData().map(d => d.absenzCount));

  referenceLines = computed<IReferenceLine[]>(() => {
    const data = this.dailyData();
    return [
      { values: data.map(d => d.wunschCount), color: WUNSCH_COLOR, dashArray: WUNSCH_DASH, strokeWidth: LINE_STROKE_WIDTH },
      { values: data.map(d => d.maxCount), color: MAX_COLOR, dashArray: MAX_DASH, strokeWidth: LINE_STROKE_WIDTH },
      { values: data.map(d => d.totalCount), color: TOTAL_COLOR, dashArray: TOTAL_DASH, strokeWidth: LINE_STROKE_WIDTH },
    ];
  });

  plotBackground = computed<string>(() => {
    this.gridColorService.isReset();
    return this.gridColorService.backGroundColor;
  });

  specialDays = computed<ISpecialDay[]>(() => {
    this.holidayCollection.isReset();
    this.gridColorService.isReset();
    const lang = this.currentLang();
    const satColor = this.gridColorService.backGroundColorSaturday;
    const sunColor = this.gridColorService.backGroundColorSunday;
    const holColor = this.gridColorService.backGroundColorOfficiallyHoliday;
    return this.dailyData().flatMap((d, i) => {
      const [y, m, day] = d.date.split('-').map(Number);
      const date = new Date(y, m - 1, day);
      const dow = date.getDay();
      const result: ISpecialDay[] = [];
      if (dow === 6) result.push({ index: i, type: 'saturday' as SpecialDayType, color: satColor });
      else if (dow === 0) result.push({ index: i, type: 'sunday' as SpecialDayType, color: sunColor });
      const holidayInfo = this.holidayCollection.holidays.holidayInfo(date);
      if (holidayInfo) {
        result.push({
          index: i,
          type: 'holiday' as SpecialDayType,
          color: holColor,
          tooltip: getLocalizedValue(holidayInfo.currentName, lang) ?? undefined,
        });
      }
      return result;
    });
  });

  monthMarkers = computed<IMonthMarker[]>(() => {
    const data = this.dailyData();
    const markers: IMonthMarker[] = [];
    let lastMonth = -1;
    data.forEach((d, i) => {
      const month = new Date(d.date).getMonth();
      if (month !== lastMonth) {
        markers.push({
          index: i,
          label: new Intl.DateTimeFormat(navigator.language, { month: 'short' }).format(new Date(d.date)),
        });
        lastMonth = month;
      }
    });
    return markers;
  });

  ngOnInit(): void {
    this.loadData();
    this.loadManual();
    void this.loadHolidays();
    this.translate.onLangChange.subscribe(e => {
      this.loadManual();
      this.currentLang.set(e.lang);
    });
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual('resource-monitor-manual', lang)
      .subscribe(content => this.manualContent.set(content));
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const groupId = this.selectedGroupId() ?? undefined;
    this.dataDashboardService.getResourceMonitor(this.selectedYear(), groupId).subscribe({
      next: (data) => { this.dailyData.set(data.dailyData); this.isLoading.set(false); },
      error: () => { this.error.set('Failed to load resource monitor data'); this.isLoading.set(false); },
    });
  }

  private async loadHolidays(): Promise<void> {
    await this.holidayCollection.readDataAsync();
    this.holidayCollection.currentYear = this.selectedYear();

    const selectionId = this.appSettings.contactSettings().globalCalendarSelectionId;
    if (!selectionId) return;

    try {
      const selection = await lastValueFrom(
        this.dataCalendarSelectionService.getCalendarSelection(selectionId)
      );
      if (!selection?.selectedCalendars?.length) return;

      const tokens = selection.selectedCalendars.map(sc => {
        const token = new StateCountryToken();
        token.country = sc.country;
        token.state = sc.state;
        return token;
      });
      this.holidayCollection.setSelection(tokens);
    } catch {
      // holiday loading is non-critical
    }
  }

  onYearChanged(year: number): void {
    this.selectedYear.set(year);
    this.loadData();
    this.holidayCollection.currentYear = year;
  }

  onGroupSelected(group: Group | null): void {
    this.selectedGroupId.set(group?.id ?? null);
    this.loadData();
  }
}
