// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full-width dashboard card with year picker and group filter showing daily Soll/Ist hours as line chart.
 * @param dataDashboardService - Provides resource monitor data and group tree for the dropdown
 */
import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { LineChartComponent, ILineChartSeries } from 'src/app/presentation/shared/line-chart/line-chart.component';
import { IResourceMonitorDay } from 'src/app/domain/models/dashboard-class';
import { IGroup } from 'src/app/domain/models/group/group-class';

interface IGroupOption {
  id: string | null;
  name: string;
}

@Component({
  selector: 'app-dashboard-resource-monitor',
  templateUrl: './dashboard-resource-monitor.component.html',
  styleUrls: ['./dashboard-resource-monitor.component.scss'],
  standalone: true,
  imports: [TranslateModule, LineChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardResourceMonitorComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);

  selectedYear = signal(new Date().getFullYear());
  selectedGroupId = signal<string | null>(null);
  groupOptions = signal<IGroupOption[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  private dailyData = signal<IResourceMonitorDay[]>([]);

  readonly MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  chartSeries = computed<ILineChartSeries[]>(() => {
    const data = this.dailyData();
    if (!data.length) return [];
    return [
      { label: 'Soll-Std.', color: '#4A90D9', dashed: false, data: data.map(d => d.shouldHours) },
      { label: 'Ist-Std.',  color: '#27AE60', dashed: true,  data: data.map(d => d.actualHours) },
    ];
  });

  todayIndex = computed<number | undefined>(() => {
    const data = this.dailyData();
    if (!data.length) return undefined;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const idx = data.findIndex(day => day.date === todayStr);
    return idx >= 0 ? idx : undefined;
  });

  ngOnInit(): void {
    this.loadGroups();
    this.loadData();
  }

  private loadGroups(): void {
    this.dataDashboardService.getClientsOverviewData().subscribe({
      next: (tree) => {
        const options: IGroupOption[] = [];
        this.flattenGroups(tree.nodes, options);
        this.groupOptions.set(options);
      },
      error: () => this.groupOptions.set([]),
    });
  }

  private flattenGroups(groups: IGroup[], result: IGroupOption[], depth = 0): void {
    for (const g of groups) {
      if (g.id) result.push({ id: g.id, name: '  '.repeat(depth) + g.name });
      if (g.children?.length) this.flattenGroups(g.children, result, depth + 1);
    }
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

  prevYear(): void { this.selectedYear.update(y => y - 1); this.loadData(); }
  nextYear(): void { this.selectedYear.update(y => y + 1); this.loadData(); }

  onGroupChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedGroupId.set(value || null);
    this.loadData();
  }
}
