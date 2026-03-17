// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modelle fuer die What-If-Analyse (Szenario-Verwaltung).
 * @param IAnalyseScenario - Repraesentiert ein gespeichertes Analyse-Szenario mit Status und Token
 * @param ICreateAnalyseScenarioRequest - Request-Daten zum Erstellen eines neuen Szenarios
 * @param AnalyseScenarioStatus - Status-Enum: Active, Accepted, Rejected
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
