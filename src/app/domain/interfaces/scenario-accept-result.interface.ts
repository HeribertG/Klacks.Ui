// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Response of accepting a scenario: whether it was accepted and how many of its entries were not taken over because
 * they fall on a locked day (sealed day or locked entry). The original plan stays unchanged on those days.
 * @param accepted - True when the scenario was promoted into the original plan
 * @param skippedLockedWorks - Scenario works not taken over because of a locked day
 * @param skippedLockedBreaks - Scenario absences not taken over because of a locked day
 * @param skippedLockedNotes - Scenario notes not taken over because of a locked day
 * @param skippedLockedTotal - Sum of the three counts
 */
export interface IScenarioAcceptResult {
  accepted: boolean;
  skippedLockedWorks: number;
  skippedLockedBreaks: number;
  skippedLockedNotes: number;
  skippedLockedTotal: number;
}
