// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server answers a refused reset of a cut family with a coded 409. The interceptor explains it in the user's language;
 * every reason of the refusal has the same code and the same text. readShiftRefusalToast names the toast for this refusal and
 * for a refused end date, so the interceptor handles both coded shift refusals in one place.
 * @param error - The failed response
 */

import { HttpStatusCode } from '@angular/common/http';
import { readRefusalCode } from './read-refusal-code.helper';
import {
  isShiftEndDateRefusal,
  SHIFT_END_DATE_REFUSED_KEY,
  SHIFT_END_DATE_REFUSED_TOAST_NAME,
} from './shift-end-date-refusal.helper';

export const SHIFT_RESET_REFUSED_KEY = 'shift.cut-shift.reset-refused';
export const SHIFT_RESET_REFUSED_TOAST_NAME = 'shift-reset-refused';

const SHIFT_RESET_REFUSED_CODE = 'SHIFT_RESET_REFUSED';

export function isShiftResetRefusal(error: unknown): boolean {
  return readRefusalCode(error, HttpStatusCode.Conflict) === SHIFT_RESET_REFUSED_CODE;
}

export function readShiftRefusalToast(error: unknown): { key: string; toastName: string } | null {
  if (isShiftEndDateRefusal(error)) {
    return { key: SHIFT_END_DATE_REFUSED_KEY, toastName: SHIFT_END_DATE_REFUSED_TOAST_NAME };
  }

  if (isShiftResetRefusal(error)) {
    return { key: SHIFT_RESET_REFUSED_KEY, toastName: SHIFT_RESET_REFUSED_TOAST_NAME };
  }

  return null;
}
