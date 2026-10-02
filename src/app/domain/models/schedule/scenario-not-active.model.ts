// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server refuses to accept or reject a scenario that is no longer active (already accepted,
 * rejected or superseded, e.g. in another tab or by Klacksy) with a 409 carrying this error code.
 * It must not be mistaken for the compliance block, which is also a 409 but offers an override.
 */
import { HttpErrorResponse } from '@angular/common/http';

export const SCENARIO_NOT_ACTIVE_ERROR_CODE = 'SCENARIO_NOT_ACTIVE';

/** Recognises the server's "scenario is no longer active" conflict. */
export function isScenarioNotActiveError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
    return false;
  }

  const body = error.error as Record<string, unknown> | null;
  return !!body && body['errorCode'] === SCENARIO_NOT_ACTIVE_ERROR_CODE;
}
