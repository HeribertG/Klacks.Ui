// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { PlanningRuleRemaining } from 'src/app/domain/models/schedule/planning-rule-remaining.model';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';

export interface AutoWizardResult {
  jobId: string;
  finalScenarioId: string | null;
  finalScenarioToken: string | null;
  finalScenarioName: string | null;
  elapsedMs: number;
  qualificationGaps?: QualificationGapDetail[];
  planningRuleWarnings?: ScheduleErrorEntry[] | null;
  planningRuleRemaining?: PlanningRuleRemaining | null;
  summary?: ScenarioSummary | null;
}
