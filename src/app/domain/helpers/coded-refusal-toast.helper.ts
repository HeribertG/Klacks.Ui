// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The coded refusals the interceptor explains with one toast and passes on: a frozen, consumed or cut key a shift screen
 * saved into, a refused move reversal, a WorkChange refused on a container, a container or template that does not
 * hold all of its services, a refused action on a service inside a container, and a refused end date or reset of a
 * shift. Checked in that order.
 * @param error - The failed response
 */

import { HttpErrorResponse } from '@angular/common/http';
import { SCENARIO_VARIANT_REFUSAL_TOAST_NAME } from 'src/app/domain/constants/scenario-variant.constants';
import { CodedRefusalToast } from 'src/app/domain/interfaces/coded-refusal-toast.interface';
import { readScenarioVariantConflictKey } from 'src/app/domain/models/schedule/scenario-variant-refusal.model';
import { CONTAINER_WORK_CHANGE_TOAST_NAME, containerWorkChangeRefusalKey } from './container-work-change-refusal.helper';
import { MOVE_REVERSAL_TOAST_NAME, moveReversalRefusalKey } from './move-reversal-refusal.helper';
import { readShiftRefusalToast } from './shift-reset-refusal.helper';
import { CONTAINER_REFUSAL_TOAST_NAME, containerRefusalKey } from './container-refusal.helper';

export function codedRefusalToast(error: HttpErrorResponse): CodedRefusalToast | null {
  const variantKey = readScenarioVariantConflictKey(error);
  if (variantKey) {
    return { key: variantKey, name: SCENARIO_VARIANT_REFUSAL_TOAST_NAME };
  }

  const reversalKey = moveReversalRefusalKey(error);
  if (reversalKey) {
    return { key: reversalKey, name: MOVE_REVERSAL_TOAST_NAME };
  }

  const workChangeKey = containerWorkChangeRefusalKey(error);
  if (workChangeKey) {
    return { key: workChangeKey, name: CONTAINER_WORK_CHANGE_TOAST_NAME };
  }

  const containerKey = containerRefusalKey(error);
  if (containerKey) {
    return { key: containerKey, name: CONTAINER_REFUSAL_TOAST_NAME };
  }

  const shiftRefusal = readShiftRefusalToast(error);
  return shiftRefusal ? { key: shiftRefusal.key, name: shiftRefusal.toastName } : null;
}
