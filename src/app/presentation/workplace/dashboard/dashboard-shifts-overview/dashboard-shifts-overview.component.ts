// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, OnInit, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { TranslateModule } from '@ngx-translate/core';
import { PieChartComponent, PieChartData } from 'src/app/presentation/shared/pie-chart/pie-chart.component';
import { IGroup } from 'src/app/domain/models/group/group-class';

@Component({
  selector: 'app-dashboard-shifts-overview',
  templateUrl: './dashboard-shifts-overview.component.html',
  styleUrls: ['./dashboard-shifts-overview.component.scss'],
  standalone: true,
  imports: [TranslateModule, PieChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardShiftsOverviewComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);

  public chartData = signal<PieChartData[]>([]);
  public totalShifts = signal(0);
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  private readonly colors = [
    '#f64e60',
    '#8950fc',
    '#3699ff',
    '#1bc5bd',
    '#6993ff',
    '#ffa800',
    '#1bc5bd',
    '#f64e60',
    '#ffa800',
    '#8950fc',
  ];

  ngOnInit(): void {
    this.loadGroupData();
  }

  private loadGroupData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dataDashboardService.getClientsOverviewData().subscribe({
      next: (tree) => {
        const groups = this.flattenGroups(tree.nodes || []);
        const data = this.prepareChartData(groups);
        this.chartData.set(data);

        const total = data.reduce((sum, item) => sum + item.value, 0);
        this.totalShifts.set(total);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load shift data');
        console.error('Error loading shifts:', err);
        this.isLoading.set(false);
      },
    });
  }

  private flattenGroups(groups: IGroup[]): IGroup[] {
    const result: IGroup[] = [];

    for (const group of groups) {
      result.push(group);
      if (group.children && group.children.length > 0) {
        result.push(...this.flattenGroups(group.children));
      }
    }

    return result;
  }

  private prepareChartData(groups: IGroup[]): PieChartData[] {
    const groupsWithShifts = groups.filter(g => g.shiftsCount > 0);

    return groupsWithShifts.map((group, index) => ({
      label: group.name,
      value: group.shiftsCount,
      color: this.colors[index % this.colors.length],
    }));
  }
}
