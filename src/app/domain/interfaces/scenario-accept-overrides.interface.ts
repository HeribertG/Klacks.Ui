// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The two independent acknowledgements an accept can carry. Neither ever passes the other check, so a user who
 * meets both warnings confirms each one separately.
 * @param overrideBlock - Supervisor override of Block-mode compliance violations (admin or supervisor only)
 * @param overrideStale - Accept although the original plan changed after the scenario was created, overwriting those changes
 */
export interface IScenarioAcceptOverrides {
  overrideBlock: boolean;
  overrideStale: boolean;
}
