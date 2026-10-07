// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Query for GET Recovery/Candidates: who could stand in for one shift on one day.
 * @param date - Calendar day "yyyy-MM-dd"
 * @param startTime - Slot start "HH:mm:ss"
 * @param endTime - Slot end "HH:mm:ss"
 * @param analyseToken - Scenario token, so the candidates are judged against the proposal's schedule
 * @param overrideBlock - Let a supervisor see candidates behind a rule that only blocks in escalation mode
 */
export interface IReplacementCandidatesQuery {
  shiftId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  groupId?: string | null;
  analyseToken?: string | null;
  overrideBlock?: boolean;
}
