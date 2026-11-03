// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The coded refusals the interceptor explains with one toast and passes on: a frozen, consumed or cut key a shift screen
 * saved into, a refused move reversal, and a refused end date of a real locked shift. Checked in that order.
 * @param error - The failed response
 */

import { HttpErrorResponse } from '@angular/common/http';
import { SCENARIO_VARIANT_REFUSAL_TOAST_NAME } from 'src/app/domain/constants/scenario-variant.constants';
import { CodedRefusalToast } from 'src/app/domain/interfaces/coded-refusal-toast.interface';
import { readScenarioVariantConflictKey } from 'src/app/domain/models/schedule/scenario-variant-refusal.model';
import { MOVE_REVERSAL_TOAST_NAME, moveReversalRefusalKey } from './move-reversal-refusal.helper';
import {
  isShiftEndDateRefusal,
  SHIFT_END_DATE_REFUSED_KEY,
  SHIFT_END_DATE_REFUSED_TOAST_NAME,
} from './shift-end-date-refusal.helper';

export function codedRefusalToast(error: HttpErrorResponse): CodedRefusalToast | null {
  const variantKey = readScenarioVariantConflictKey(error);
  if (variantKey) {
    return { key: variantKey, name: SCENARIO_VARIANT_REFUSAL_TOAST_NAME };
  }

  const reversalKey = moveReversalRefusalKey(error);
  if (reversalKey) {
    return { key: reversalKey, name: MOVE_REVERSAL_TOAST_NAME };
  }

  return isShiftEndDateRefusal(error)
    ? { key: SHIFT_END_DATE_REFUSED_KEY, name: SHIFT_END_DATE_REFUSED_TOAST_NAME }
    : null;
}
