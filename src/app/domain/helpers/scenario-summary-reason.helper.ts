// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Maps a backend open-slot reason code to its translation key. A code this client does not know (a newer backend)
 * falls back to the generic capacity-or-rules text instead of showing a raw key.
 * @param reasonCode - Reason code of an open-slot reason as sent by the backend
 */

import {
  SCENARIO_OPEN_SLOT_REASON,
  SCENARIO_OPEN_SLOT_REASON_FALLBACK,
  SCENARIO_OPEN_SLOT_REASON_KEY_PREFIX,
} from 'src/app/domain/constants/scenario-summary.constants';

const KNOWN_REASON_CODES: readonly string[] = Object.values(SCENARIO_OPEN_SLOT_REASON);

export function scenarioOpenSlotReasonKey(reasonCode: string): string {
  const code = KNOWN_REASON_CODES.includes(reasonCode) ? reasonCode : SCENARIO_OPEN_SLOT_REASON_FALLBACK;
  return `${SCENARIO_OPEN_SLOT_REASON_KEY_PREFIX}${code}`;
}
