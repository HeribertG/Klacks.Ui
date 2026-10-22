// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only


import { Component, inject, OnInit, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DashboardStatisticsService } from 'src/app/domain/services/dashboard/dashboard-statistics.service';
import { TranslateModule } from '@ngx-translate/core';
import { PieChartComponent } from 'src/app/presentation/shared/pie-chart/pie-chart.component';
import { PieChartData } from 'src/app/presentation/shared/pie-chart/pie-chart-data.interface';

@Component({
  selector: 'app-dashboard-clients-overview',
  templateUrl: './dashboard-clients-overview.component.html',
  styleUrls: ['./dashboard-clients-overview.component.scss'],
  standalone: true,
  imports: [TranslateModule, PieChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardClientsOverviewComponent implements OnInit {
  private dashboardStatistics = inject(DashboardStatisticsService);

  public chartData = signal<PieChartData[]>([]);
  public totalClients = signal(0);
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  private readonly colors = [
    '#1bc5bd',
    '#6993ff',
    '#ffa800',
    '#f64e60',
    '#8950fc',
    '#3699ff',
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

    this.dashboardStatistics.loadCustomerCountsByGroup().subscribe({
      next: (counts) => {
        const data: PieChartData[] = counts.map((count, index) => ({
          ...count,
          color: this.colors[index % this.colors.length],
        }));
        this.chartData.set(data);

        const total = data.reduce((sum, item) => sum + item.value, 0);
        this.totalClients.set(total);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('dashboard.error.loadGroups');
        console.error('Error loading groups:', err);
        this.isLoading.set(false);
      },
    });
  }
}
