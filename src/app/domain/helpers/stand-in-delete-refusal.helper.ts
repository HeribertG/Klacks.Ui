// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The coded 409 refusal to delete a stand-in that still holds services of the plan, explained in the user's language
 * with the stand-in's name and the number of its services.
 * @param error - The failed response
 */

import { HttpStatusCode } from '@angular/common/http';
import { CodedRefusalToast } from 'src/app/domain/interfaces/coded-refusal-toast.interface';
import { readRefusalCode } from './read-refusal-code.helper';

export const STAND_IN_DELETE_REFUSAL_TOAST_NAME = 'stand-in-delete-refused';

const STAND_IN_HAS_WORKS_ERROR_CODE = 'STAND_IN_HAS_WORKS';
const STAND_IN_HAS_WORKS_KEY = 'address.delete.standInHasWorks';

export function standInDeleteRefusalToast(error: unknown): CodedRefusalToast | null {
  if (readRefusalCode(error, HttpStatusCode.Conflict) !== STAND_IN_HAS_WORKS_ERROR_CODE) {
    return null;
  }

  const body = (error as { error: { standInName?: string; workCount?: number } }).error;
  return {
    key: STAND_IN_HAS_WORKS_KEY,
    name: STAND_IN_DELETE_REFUSAL_TOAST_NAME,
    params: { name: body.standInName ?? '', count: body.workCount ?? 0 },
  };
}
