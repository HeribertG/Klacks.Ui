// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReplacementRequestOutcome } from '../enums/replacement-request-outcome.enum';
import { ReplacementRequestSource } from '../enums/replacement-request-source.enum';

/**
 * One stored replacement request: who was asked to stand in for whom, on which shift, and what came back.
 * @param date - Calendar day "yyyy-MM-dd"
 * @param startTime - Slot start "HH:mm:ss"
 * @param endTime - Slot end "HH:mm:ss"
 * @param isShortNotice - The request was reported shortly before the shift start
 */
export interface IReplacementRequest {
  id: string;
  absentClientId: string;
  candidateClientId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  groupId: string | null;
  absenceId: string | null;
  source: ReplacementRequestSource;
  outcome: ReplacementRequestOutcome;
  reportedAtUtc: string;
  shiftStartUtc: string;
  outcomeAtUtc: string | null;
  outcomeByUserId: string | null;
  analyseToken: string | null;
  workChangeId: string | null;
  appliedAtUtc: string | null;
  isShortNotice: boolean;
}
