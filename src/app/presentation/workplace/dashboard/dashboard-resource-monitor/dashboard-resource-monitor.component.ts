// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full-width dashboard card showing daily workforce headcount as a Resource Histogram.
 * 365 daily stacked bars (green = services count, gray = absent employees) with
 * month-boundary labels and a red dashed line for active contracts (max capacity).
 * @param dataDashboardService - Provides resource monitor data
 */
import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import { IMonthMarker, StackedBarChartComponent } from 'src/app/presentation/shared/stacked-bar-chart/stacked-bar-chart.component';

@Component({
  selector: 'app-dashboard-resource-monitor',
  templateUrl: './dashboard-resource-monitor.component.html',
  styleUrls: ['./dashboard-resource-monitor.component.scss'],
  standalone: true,
  imports: [TranslateModule, CounterComponent, GroupSelectComponent, StackedBarChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardResourceMonitorComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);

  selectedYear = signal(new Date().getFullYear());
  selectedGroupId = signal<string | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  private dailyData = signal([] as { date: string; dienstCount: number; absenzCount: number; maxKapazitaetCount: number }[]);

  maxYear = computed(() => this.selectedYear() + 30);

  dienstByDay = computed(() => this.dailyData().map(d => d.dienstCount));
  absenzByDay = computed(() => this.dailyData().map(d => d.absenzCount));
  maxKapazitaetByDay = computed(() => this.dailyData().map(d => d.maxKapazitaetCount));

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
  }

  onGroupSelected(group: Group | null): void {
    this.selectedGroupId.set(group?.id ?? null);
    this.loadData();
  }
}
