// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dashboard metrics for Klacksy training. Initial version: target counts by status.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { countTargetsByStatus } from 'src/app/domain/helpers/klacksy-training-target-status-counts.helper';
import { IKlacksyTrainingTargetStatusCounts } from 'src/app/domain/models/klacksy-training/klacksy-training-target-status-counts.interface';
import { KlacksyTrainingMetricsService } from 'src/app/domain/services/klacksy/klacksy-training-metrics.service';

@Component({
  selector: 'app-klacksy-training-metrics',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './klacksy-training-metrics.component.html',
  styleUrls: ['./klacksy-training-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingMetricsComponent implements OnInit {
  private readonly metricsService = inject(KlacksyTrainingMetricsService);
  protected readonly counts = signal<IKlacksyTrainingTargetStatusCounts>(countTargetsByStatus([]));

  ngOnInit(): void { this.metricsService.loadTargetStatusCounts().subscribe(x => this.counts.set(x)); }
}
