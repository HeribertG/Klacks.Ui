// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Explains a refused move reversal in the user's language. The server answers a coded 400 (already back, moved on, held, origin busy)
 * or 404 for a missing or hidden service; anything else keeps the generic handling.
 * @param error - The failed response
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { readRefusalCode } from './read-refusal-code.helper';

export const MOVE_REVERSAL_PATH = '/ReverseMove';
export const MOVE_REVERSAL_TOAST_NAME = 'move-reversal-refused';
export const MOVE_REVERSAL_NOT_FOUND_KEY = 'schedule.move-reversal.not-found';

const MOVE_REVERSAL_KEYS: Readonly<Record<string, string>> = {
  MOVE_ALREADY_BACK: 'schedule.move-reversal.already-back',
  MOVE_MOVED_ON: 'schedule.move-reversal.moved-on',
  MOVE_HELD: 'schedule.move-reversal.held',
  MOVE_NOT_APPLIED: 'schedule.move-reversal.not-applied',
  MOVE_ALREADY_REVERSED: 'schedule.move-reversal.already-reversed',
  MOVE_ORIGIN_BUSY: 'schedule.move-reversal.origin-busy',
};

export function moveReversalRefusalKey(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || !(error.url ?? '').includes(MOVE_REVERSAL_PATH)) {
    return null;
  }

  if (error.status === HttpStatusCode.NotFound) {
    return MOVE_REVERSAL_NOT_FOUND_KEY;
  }

  const code = readRefusalCode(error);
  return code ? (MOVE_REVERSAL_KEYS[code] ?? null) : null;
}
