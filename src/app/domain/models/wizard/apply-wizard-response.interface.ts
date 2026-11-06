// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { SkippedPlacementEntry } from 'src/app/domain/models/schedule/skipped-placement.model';
import { KeywordWishes } from 'src/app/domain/models/schedule/keyword-wishes.interface';

export interface ApplyWizardResponse {
  createdWorkIds: string[];
  complianceViolations: ScheduleErrorEntry[];
  skippedPlacements: SkippedPlacementEntry[];
  overrideApplied: boolean;
  keywordWishes?: KeywordWishes | null;
}
