// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Scope an AutoWizard run is bound to, captured when the planner clicks the button.
 * @param jobId - Server job id, null until the start request returned
 * @param groupId - Schedule group the run plans (null = no group filter)
 * @param groupName - Display name of that group for toasts and tooltips
 * @param periodFrom - First planned day as calendar date wire string
 * @param periodUntil - Last planned day as calendar date wire string
 */
export interface AutoWizardJobContext {
  jobId: string | null;
  groupId: string | null;
  groupName: string;
  periodFrom: string;
  periodUntil: string;
}
