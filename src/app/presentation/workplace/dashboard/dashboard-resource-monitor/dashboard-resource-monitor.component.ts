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
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { HolidaysListHelper, HolidayStatus } from 'src/app/domain/models/calendar/calendar-rule-class';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardResourceMonitorComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);
  private dataCalendarRuleService = inject(DataCalendarRuleService);
  private appSettings = inject(AppSettingsManagementService);
  private gridColorService = inject(GridColorService);
  private manualLoader = inject(ManualLoaderService);
  private translate = inject(TranslateService);

  private readonly holidaysHelper = new HolidaysListHelper();
  private readonly holidaysVersion = signal(0);
  private calendarRulesLoaded = false;

  private static readonly SPECIAL_DAY_OPACITY = 0.35;

  selectedYear = signal(new Date().getFullYear());
  selectedGroupId = signal<string | null>(null);
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
      {
        values: data.map(d => d.wunschCount),
        color: WUNSCH_COLOR,
        dashArray: WUNSCH_DASH,
        strokeWidth: LINE_STROKE_WIDTH,
      },
      {
        values: data.map(d => d.maxCount),
        color: MAX_COLOR,
        dashArray: MAX_DASH,
        strokeWidth: LINE_STROKE_WIDTH,
      },
      {
        values: data.map(d => d.totalCount),
        color: TOTAL_COLOR,
        dashArray: TOTAL_DASH,
        strokeWidth: LINE_STROKE_WIDTH,
      },
    ];
  });

  specialDays = computed<ISpecialDay[]>(() => {
    this.holidaysVersion();
    this.gridColorService.isReset();
    const satColor = this.gridColorService.backGroundColorSaturday;
    const sunColor = this.gridColorService.backGroundColorSunday;
    const holColor = this.gridColorService.backGroundColorOfficiallyHoliday;
    const opacity = DashboardResourceMonitorComponent.SPECIAL_DAY_OPACITY;
    return this.dailyData().flatMap((d, i) => {
      const [y, m, day] = d.date.split('-').map(Number);
      const date = new Date(y, m - 1, day);
      const dow = date.getDay();
      const result: ISpecialDay[] = [];
      if (dow === 6) result.push({ index: i, type: 'saturday' as SpecialDayType, color: satColor, opacity });
      else if (dow === 0) result.push({ index: i, type: 'sunday' as SpecialDayType, color: sunColor, opacity });
      if (this.holidaysHelper.isHoliday(date) !== HolidayStatus.NotAHoliday) {
        result.push({ index: i, type: 'holiday' as SpecialDayType, color: holColor, opacity });
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
    this.loadHolidays();
    this.translate.onLangChange.subscribe(() => this.loadManual());
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

  onYearChanged(year: number): void {
    this.selectedYear.set(year);
    this.loadData();
    this.recomputeHolidays();
  }

  private loadHolidays(): void {
    if (this.calendarRulesLoaded) {
      this.recomputeHolidays();
      return;
    }
    const contact = this.appSettings.contactSettings();
    const country = contact.globalCalendarCountry || contact.country;
    const state = contact.globalCalendarState || contact.state;
    this.dataCalendarRuleService.readCalendarRuleList().subscribe(rules => {
      this.calendarRulesLoaded = true;
      this.holidaysHelper.clear();
      const filtered = rules.filter(r =>
        r.country === country && (!r.state || r.state === state)
      );
      this.holidaysHelper.addRange(filtered);
      this.recomputeHolidays();
    });
  }

  private recomputeHolidays(): void {
    this.holidaysHelper.currentYear = this.selectedYear();
    this.holidaysHelper.computeHolidays();
    this.holidaysVersion.update(v => v + 1);
  }

  onGroupSelected(group: Group | null): void {
    this.selectedGroupId.set(group?.id ?? null);
    this.loadData();
  }
}
