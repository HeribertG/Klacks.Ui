
import { Component, inject, OnInit, signal } from '@angular/core';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { TranslateModule } from '@ngx-translate/core';
import { PieChartComponent, PieChartData } from 'src/app/presentation/shared/pie-chart/pie-chart.component';
import { IGroup } from 'src/app/domain/models/group-class';

@Component({
  selector: 'app-dashboard-clients-overview',
  templateUrl: './dashboard-clients-overview.component.html',
  styleUrls: ['./dashboard-clients-overview.component.scss'],
  standalone: true,
  imports: [TranslateModule, PieChartComponent],
})
export class DashboardClientsOverviewComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);

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

    this.dataDashboardService.getClientsOverviewData().subscribe({
      next: (tree) => {
        const groups = this.flattenGroups(tree.nodes || []);
        const data = this.prepareChartData(groups);
        this.chartData.set(data);

        const total = data.reduce((sum, item) => sum + item.value, 0);
        this.totalClients.set(total);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load group data');
        console.error('Error loading groups:', err);
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
    const groupsWithCustomers = groups.filter(g => g.customersCount > 0);

    return groupsWithCustomers.map((group, index) => ({
      label: group.name,
      value: group.customersCount,
      color: this.colors[index % this.colors.length],
    }));
  }
}
