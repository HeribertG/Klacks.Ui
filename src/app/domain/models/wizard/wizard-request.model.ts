// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface WizardRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  shiftIds?: string[] | null;
  analyseToken?: string | null;
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
