// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NavigationTargetDto } from 'src/app/domain/models/klacksy-training/navigation-target-dto.interface';
import { countTargetsByStatus } from './klacksy-training-target-status-counts.helper';

describe('countTargetsByStatus', () => {
  const target = (synonymStatus: string, obsolete = false): NavigationTargetDto => ({
    targetId: synonymStatus,
    route: '/',
    labelKey: 'l',
    synonyms: {},
    synonymStatus,
    obsolete,
  });

  it('returns zero counts for no targets', () => {
    expect(countTargetsByStatus([])).toEqual({
      total: 0,
      pending: 0,
      generated: 0,
      reviewed: 0,
      needsReview: 0,
      obsolete: 0,
    });
  });

  it('counts each status, obsolete wins over the status and unknown statuses count only towards the total', () => {
    const counts = countTargetsByStatus([
      target('pending'),
      target('pending'),
      target('generated'),
      target('reviewed'),
      target('needs-review'),
      target('reviewed', true),
      target('unknown'),
    ]);

    expect(counts).toEqual({
      total: 7,
      pending: 2,
      generated: 1,
      reviewed: 1,
      needsReview: 1,
      obsolete: 1,
    });
  });
});
