// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface HarmonizerRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  analyseToken?: string | null;
}

export interface StartHarmonizerResponse {
  jobId: string;
}

export interface CancelHarmonizerResponse {
  cancelled: boolean;
}

export interface HarmonizerApplyAsScenarioResponse {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  runGroupId: string | null;
  createdWorkIds: string[];
}
