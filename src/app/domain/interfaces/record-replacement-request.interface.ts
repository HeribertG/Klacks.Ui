// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReplacementRequestOutcome } from '../enums/replacement-request-outcome.enum';

/**
 * Body for POST Recovery/Requests: records a contact attempt on an alternative candidate. The server
 * upserts on scenario token, candidate, shift and day; an acceptance makes the candidate the slot's replacement in
 * the scenario, every other answer leaves the proposal unchanged.
 * @param absentClientId - The employee who is absent
 * @param candidateClientId - The person who was contacted
 * @param date - Calendar day "yyyy-MM-dd"
 * @param startTime - Slot start "HH:mm:ss"
 * @param endTime - Slot end "HH:mm:ss"
 * @param analyseToken - Token of the scenario the contact belongs to
 * @param overrideBlock - Supervisor override for a blocking rule, as chosen when the cover was proposed
 */
export interface IRecordReplacementRequest {
  absentClientId: string;
  candidateClientId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  groupId?: string | null;
  absenceId?: string | null;
  analyseToken?: string | null;
  outcome: ReplacementRequestOutcome;
  overrideBlock?: boolean;
}
