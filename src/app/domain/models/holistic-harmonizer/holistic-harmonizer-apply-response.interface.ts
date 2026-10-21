// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScenarioComplianceReport } from 'src/app/domain/models/schedule/scenario-compliance-report.model';

export interface HolisticHarmonizerApplyResponse {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  runGroupId: string | null;
  createdWorkIds: string[];
  complianceReport?: ScenarioComplianceReport;
}
