// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
}

export interface StartWizardResponse {
  jobId: string;
}

export interface CancelWizardResponse {
  cancelled: boolean;
}

export interface ApplyWizardResponse {
  createdWorkIds: string[];
}

export interface WizardApplyAsScenarioResponse {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  createdWorkIds: string[];
}
