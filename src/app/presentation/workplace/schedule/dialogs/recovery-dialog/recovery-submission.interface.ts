// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/** What the review step was computed for, so later calls do not read a form the planner may have edited. */
export interface IRecoverySubmission {
  absentClientId: string;
  absenceId: string;
  groupId: string;
  overrideBlock: boolean;
}
