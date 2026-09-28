// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Scenario an AutoWizard run produced for a group the planner was not looking at when it ended.
 * @param groupId - Schedule group the scenario belongs to (null = no group filter)
 * @param periodFrom - First planned day of the run as calendar date wire string
 * @param periodUntil - Last planned day of the run as calendar date wire string
 * @param scenarioId - Id of the analyse scenario
 * @param token - Analyse token of the scenario
 * @param name - Display name of the scenario
 */
export interface AutoWizardPendingScenario {
  groupId: string | null;
  periodFrom: string;
  periodUntil: string;
  scenarioId: string;
  token: string;
  name: string;
}
