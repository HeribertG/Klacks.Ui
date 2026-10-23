// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HolisticHarmonizerSwapDto } from './holistic-harmonizer-swap-dto.interface';
import { HolisticHarmonizerRejectionDto } from './holistic-harmonizer-rejection-dto.interface';
import { HolisticHarmonizerBatchDto } from './holistic-harmonizer-batch-dto.interface';
import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { PlanningRuleRemaining } from 'src/app/domain/models/schedule/planning-rule-remaining.model';
import { PlanCriticResult } from './plan-critic-result.interface';

export interface HolisticHarmonizerRunResponse {
  jobId: string;
  llmModelId: string;
  fitnessBefore: number;
  fitnessAfter: number;
  acceptedSwaps: HolisticHarmonizerSwapDto[];
  rejectedSwaps: HolisticHarmonizerRejectionDto[];
  batches: HolisticHarmonizerBatchDto[];
  agentDisplayNames: string[];
  qualificationGaps?: QualificationGapDetail[];
  llmParsingError: string | null;
  llmRawResponsePreview: string | null;
  planningRuleWarnings?: ScheduleErrorEntry[] | null;
  planningRuleRemaining?: PlanningRuleRemaining | null;
  planCritic?: PlanCriticResult | null;
}
