// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Models for what-if analysis (scenario management).
 * @param IAnalyseScenario - Represents a saved analysis scenario with status and token
 * @param ICreateAnalyseScenarioRequest - Request data for creating a new scenario
 * @param AnalyseScenarioStatus - Status enum: Active, Accepted, Rejected
 */

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

export interface ICreateAnalyseScenarioRequest {
  name: string;
  description?: string;
  groupId?: string;
  fromDate: string;
  untilDate: string;
}

export enum AnalyseScenarioStatus {
  Active = 0,
  Accepted = 1,
  Rejected = 2,
}
