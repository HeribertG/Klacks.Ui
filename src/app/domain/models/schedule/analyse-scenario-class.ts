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
  groupId: string;
  fromDate: string;
  untilDate: string;
  token: string;
  createdByUser: string;
  status: AnalyseScenarioStatus;
}

export interface ICreateAnalyseScenarioRequest {
  name: string;
  description?: string;
  groupId: string;
  fromDate: string;
  untilDate: string;
}

export enum AnalyseScenarioStatus {
  Active = 0,
  Accepted = 1,
  Rejected = 2,
}
