// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Models for what-if analysis (scenario management).
 * @param IAnalyseScenario - Represents a saved analysis scenario with status and token
 */

import { AnalyseScenarioStatus } from './analyse-scenario-status.enum';

export interface IAnalyseScenario {
  id: string;
  name: string;
  description?: string;
  groupId?: string;
  fromDate: string;
  untilDate: string;
  token: string;
  runGroupId?: string | null;
  createdByUser: string;
  status: AnalyseScenarioStatus;
  /** Serialised score snapshot of the run that produced this scenario; absent for a hand-made one. */
  subScoreJson?: string | null;
  /** Share of cells the run moved relative to the plan it started from. */
  churnRatio?: number | null;
  /** Hard-constraint violations the produced plan still carries. */
  stage0Violations?: number | null;
}

/** Author the background optimiser records on the scenarios it creates. */
export const WIZARD4_SYSTEM_ACTOR = 'wizard4';

/** True when this scenario is a suggestion of the background optimiser rather than a planner's own. */
export function isWizard4Candidate(scenario: IAnalyseScenario): boolean {
  return scenario.createdByUser === WIZARD4_SYSTEM_ACTOR;
}
