// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Zeigt Shift-Abdeckung und Versiegelungsstatus als zwei Donut-Charts im Dashboard-Card-Stil.
 * @param dataDashboardService - API-Service zum Laden der Statistikdaten
 */
import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PieChartComponent, PieChartData } from 'src/app/presentation/shared/pie-chart/pie-chart.component';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { IShiftCoverageStatistics } from 'src/app/domain/models/dashboard-class';

@Component({
  selector: 'app-dashboard-shift-coverage',
  templateUrl: './dashboard-shift-coverage.component.html',
  styleUrls: ['./dashboard-shift-coverage.component.scss'],
  standalone: true,
  imports: [TranslateModule, PieChartComponent],
})
export class DashboardShiftCoverageComponent implements OnInit {
  private dataDashboardService = inject(DataDashboardService);

  public coverageChartData = signal<PieChartData[]>([]);
  public sealedChartData = signal<PieChartData[]>([]);
  public totalCoveredSlots = signal(0);
  public totalSealedEntries = signal(0);
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
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dataDashboardService.getShiftCoverageStatistics().subscribe({
      next: (statistics: IShiftCoverageStatistics[]) => {
        const filtered = statistics.filter((s) => s.totalSlots > 0);

        const coverageData = filtered.map((s, index) => ({
          label: s.groupName,
          value: s.coveredSlots,
          color: this.colors[index % this.colors.length],
        }));
        this.coverageChartData.set(coverageData);
        this.totalCoveredSlots.set(coverageData.reduce((sum, d) => sum + d.value, 0));

        const sealedData = filtered.map((s, index) => ({
          label: s.groupName,
          value: s.sealedWorkEntries,
          color: this.colors[index % this.colors.length],
        }));
        this.sealedChartData.set(sealedData);
        this.totalSealedEntries.set(sealedData.reduce((sum, d) => sum + d.value, 0));

        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set('Failed to load shift coverage statistics');
        console.error('Error loading shift coverage:', err);
        this.isLoading.set(false);
      },
    });
  }
}
