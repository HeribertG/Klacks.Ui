// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AnalyseScenarioStatus } from './analyse-scenario-status.enum';

/**
 * A variant (key): a named container of not yet binding shifts for one group and period, mirror of the backend
 * ScenarioVariantResource. Its shifts carry the variant token and stay out of every real-plan reader.
 * @param token - Token the variant's shifts carry in analyseToken
 * @param status - Same lifecycle values as a scenario; a consumed variant is no longer active
 * @param isExpired - True when the period lies in the past; the variant is shown with a hint and stays selectable for a
 *   scenario, because the backend accepts it (owner decision: a dead key is shown, not deleted)
 * @param shiftCount - Number of shifts the variant currently holds
 */
export interface IScenarioVariant {
  id: string;
  name: string;
  description?: string;
  groupId: string;
  fromDate: string;
  untilDate: string;
  token: string;
  status: AnalyseScenarioStatus;
  isExpired: boolean;
  shiftCount: number;
}
