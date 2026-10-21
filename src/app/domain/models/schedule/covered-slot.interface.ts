// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';

export interface ICoveredSlot {
  shiftId: string;
  date: string;
  replacementClientId: string;
  replacementName: string;
  /**
   * How far the search had to go: 0 direct in-group replacement, 1 in-group swap, 2 borrowed from
   * another group, 3 swap with another group, 5 on-call person of the own group, 6 on-call person of
   * another group (engine EscalationTier). The value is a label identifier only, never an ordering.
   */
  tier: number;
  /** The cloned work in the scenario the proposal is attached to; absent on older backends. */
  workId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  /** The stored replacement-request row of this proposal; null when nothing was stored. */
  requestId?: string | null;
  /** Mobile number before fixed line of the proposed stand-in. */
  phone?: string | null;
  outcome?: ReplacementRequestOutcome | null;
}
