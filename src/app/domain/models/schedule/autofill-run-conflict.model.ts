// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The identical autofill run is already in progress. The server refuses the second start with 409
 * instead of letting two jobs burn the time budget on the same period and then race for the apply, so
 * the dialogs can attach to the running job rather than showing a generic error.
 */

import { HttpErrorResponse } from '@angular/common/http';

export const AUTOFILL_RUN_CONFLICT_ERROR_CODE = 'AUTOFILL_RUN_CONFLICT';

export interface AutofillRunConflictDetails {
  runningJobId: string;
}

/** Recognises the server's run conflict and hands back the job that already holds the slot. */
export function readAutofillRunConflict(error: unknown): AutofillRunConflictDetails | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
    return null;
  }

  const body = error.error as Record<string, unknown> | null;
  if (!body || body['errorCode'] !== AUTOFILL_RUN_CONFLICT_ERROR_CODE) {
    return null;
  }

  const runningJobId = body['runningJobId'];
  if (typeof runningJobId !== 'string' || runningJobId.length === 0) {
    return null;
  }

  return { runningJobId };
}
