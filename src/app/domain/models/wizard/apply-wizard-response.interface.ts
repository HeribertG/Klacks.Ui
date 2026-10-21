// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { SkippedPlacementEntry } from 'src/app/domain/models/schedule/skipped-placement.model';

export interface ApplyWizardResponse {
  createdWorkIds: string[];
  complianceViolations: ScheduleErrorEntry[];
  skippedPlacements: SkippedPlacementEntry[];
  overrideApplied: boolean;
}
