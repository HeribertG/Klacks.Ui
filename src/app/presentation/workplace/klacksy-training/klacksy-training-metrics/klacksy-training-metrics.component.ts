// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dashboard metrics for Klacksy training. Initial version: target counts by status.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingService, NavigationTargetDto } from '../../../../core/services/klacksy-training.service';

@Component({
  selector: 'app-klacksy-training-metrics',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './klacksy-training-metrics.component.html',
  styleUrls: ['./klacksy-training-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingMetricsComponent implements OnInit {
  private readonly service = inject(KlacksyTrainingService);
  protected readonly all = signal<NavigationTargetDto[]>([]);
  protected readonly counts = computed(() => {
    const m = { total: 0, pending: 0, generated: 0, reviewed: 0, needsReview: 0, obsolete: 0 };
    for (const t of this.all()) {
      m.total++;
      if (t.obsolete) m.obsolete++;
      else if (t.synonymStatus === 'pending') m.pending++;
      else if (t.synonymStatus === 'generated') m.generated++;
      else if (t.synonymStatus === 'reviewed') m.reviewed++;
      else if (t.synonymStatus === 'needs-review') m.needsReview++;
    }
    return m;
  });

  ngOnInit(): void { this.service.listTargets().subscribe(x => this.all.set(x)); }
}
