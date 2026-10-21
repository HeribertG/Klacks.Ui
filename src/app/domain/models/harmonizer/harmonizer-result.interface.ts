// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HarmonizerRowResult } from './harmonizer-row-result.interface';
import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { PlanningRuleRemaining } from 'src/app/domain/models/schedule/planning-rule-remaining.model';

export interface HarmonizerResult {
  jobId: string;
  globalFitnessBefore: number;
  globalFitnessAfter: number;
  generationsRun: number;
  rowResults: HarmonizerRowResult[];
  qualificationGaps?: QualificationGapDetail[];
  planningRuleWarnings?: ScheduleErrorEntry[] | null;
  planningRuleRemaining?: PlanningRuleRemaining | null;
}
