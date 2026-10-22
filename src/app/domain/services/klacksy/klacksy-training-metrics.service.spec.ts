// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { DataKlacksyTrainingService } from 'src/app/infrastructure/api/klacksy-training/data-klacksy-training.service';
import { KlacksyTrainingMetricsService } from './klacksy-training-metrics.service';

describe('KlacksyTrainingMetricsService', () => {
  it('reads all targets without a filter and reduces them to the status counts', async () => {
    const api = {
      listTargets: vi.fn().mockReturnValue(
        of([
          { targetId: 'a', route: '/', labelKey: 'l', synonyms: {}, synonymStatus: 'generated', obsolete: false },
          { targetId: 'b', route: '/', labelKey: 'l', synonyms: {}, synonymStatus: 'needs-review', obsolete: false },
        ])
      ),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: DataKlacksyTrainingService, useValue: api }],
    });

    const counts = await firstValueFrom(TestBed.inject(KlacksyTrainingMetricsService).loadTargetStatusCounts());

    expect(api.listTargets).toHaveBeenCalledWith();
    expect(counts).toEqual({ total: 2, pending: 0, generated: 1, reviewed: 0, needsReview: 1, obsolete: 0 });
  });
});
