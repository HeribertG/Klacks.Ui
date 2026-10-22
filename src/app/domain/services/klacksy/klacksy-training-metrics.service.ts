// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Loads all Klacksy navigation targets and reduces them to the per-status counts shown on the training metrics tab.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { countTargetsByStatus } from 'src/app/domain/helpers/klacksy-training-target-status-counts.helper';
import { IKlacksyTrainingTargetStatusCounts } from 'src/app/domain/models/klacksy-training/klacksy-training-target-status-counts.interface';
import { DataKlacksyTrainingService } from 'src/app/infrastructure/api/klacksy-training/data-klacksy-training.service';

@Injectable({ providedIn: 'root' })
export class KlacksyTrainingMetricsService {
  private dataKlacksyTraining = inject(DataKlacksyTrainingService);

  loadTargetStatusCounts(): Observable<IKlacksyTrainingTargetStatusCounts> {
    return this.dataKlacksyTraining.listTargets().pipe(map(countTargetsByStatus));
  }
}
