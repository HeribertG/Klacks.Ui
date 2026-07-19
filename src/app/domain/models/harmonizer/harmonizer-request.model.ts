// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ScenarioComplianceReport } from 'src/app/domain/models/schedule/scenario-compliance-report.model';

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
  complianceReport?: ScenarioComplianceReport;
}
