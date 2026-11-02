// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server answers a refused end date of a real locked shift with a coded 409. The interceptor explains it in the
 * user's language and keeps the form dirty, so what was typed stays. Every reason of the refusal has the same code and
 * the same text.
 * @param error - The failed response
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export const SHIFT_END_DATE_REFUSED_KEY = 'shift.edit-shift.main.until-refused';
export const SHIFT_END_DATE_REFUSED_TOAST_NAME = 'shift-end-date-refused';

const SHIFT_END_DATE_REFUSED_CODE = 'SHIFT_END_DATE_REFUSED';

export function isShiftEndDateRefusal(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === HttpStatusCode.Conflict &&
    (error.error as { errorCode?: unknown } | null)?.errorCode === SHIFT_END_DATE_REFUSED_CODE
  );
}
