// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { SkippedPlacementEntry } from 'src/app/domain/models/schedule/skipped-placement.model';

export interface WizardTrainingOverrides {
  initAuctionRatio?: number;
}

export interface WizardRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  shiftIds?: string[] | null;
  analyseToken?: string | null;
  trainingOverrides?: WizardTrainingOverrides | null;
  agentOrderIsUserDefined?: boolean;
}

export interface StartWizardResponse {
  jobId: string;
}

export interface CancelWizardResponse {
  cancelled: boolean;
}

export interface ApplyWizardResponse {
  createdWorkIds: string[];
  complianceViolations: ScheduleErrorEntry[];
  skippedPlacements: SkippedPlacementEntry[];
  overrideApplied: boolean;
}

export interface WizardApplyAsScenarioResponse {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  runGroupId: string | null;
  createdWorkIds: string[];
  complianceViolations: ScheduleErrorEntry[];
  skippedPlacements: SkippedPlacementEntry[];
  overrideApplied: boolean;
}
