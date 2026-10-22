// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Counts Klacksy navigation targets per synonym status. Every target counts towards the total; an obsolete target
 * counts only as obsolete, whatever its synonym status; an unknown status counts towards the total only.
 * @param targets - Navigation targets as delivered by the training API
 */
import { KLACKSY_TRAINING_SYNONYM_STATUS } from 'src/app/domain/constants/klacksy-training-synonym-status.constants';
import { IKlacksyTrainingTargetStatusCounts } from 'src/app/domain/models/klacksy-training/klacksy-training-target-status-counts.interface';
import { NavigationTargetDto } from 'src/app/domain/models/klacksy-training/navigation-target-dto.interface';

export function countTargetsByStatus(targets: readonly NavigationTargetDto[]): IKlacksyTrainingTargetStatusCounts {
  const counts: IKlacksyTrainingTargetStatusCounts = {
    total: 0,
    pending: 0,
    generated: 0,
    reviewed: 0,
    needsReview: 0,
    obsolete: 0,
  };
  for (const target of targets) {
    counts.total++;
    if (target.obsolete) counts.obsolete++;
    else if (target.synonymStatus === KLACKSY_TRAINING_SYNONYM_STATUS.Pending) counts.pending++;
    else if (target.synonymStatus === KLACKSY_TRAINING_SYNONYM_STATUS.Generated) counts.generated++;
    else if (target.synonymStatus === KLACKSY_TRAINING_SYNONYM_STATUS.Reviewed) counts.reviewed++;
    else if (target.synonymStatus === KLACKSY_TRAINING_SYNONYM_STATUS.NeedsReview) counts.needsReview++;
  }
  return counts;
}
