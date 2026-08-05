// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The schedule changed between a wizard run and the attempt to apply its result. The server rejects
 * that with 409 rather than overwriting whatever was added or moved in the meantime, so the dialogs
 * can offer a re-run instead of showing a generic error.
 */

import { HttpErrorResponse } from '@angular/common/http';

export const STALE_WIZARD_RESULT_ERROR_CODE = 'staleWizardResult';

export interface StaleWizardResultDetails {
  expectedWorkCount: number;
  actualWorkCount: number;
  expectedBreakCount: number;
  actualBreakCount: number;
  placementChanged: boolean;
}

/** Recognises the server's stale-result conflict and hands back its counters. */
export function readStaleWizardResult(error: unknown): StaleWizardResultDetails | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
    return null;
  }

  const body = error.error as Record<string, unknown> | null;
  if (!body || body['errorCode'] !== STALE_WIZARD_RESULT_ERROR_CODE) {
    return null;
  }

  return {
    expectedWorkCount: Number(body['expectedWorkCount'] ?? 0),
    actualWorkCount: Number(body['actualWorkCount'] ?? 0),
    expectedBreakCount: Number(body['expectedBreakCount'] ?? 0),
    actualBreakCount: Number(body['actualBreakCount'] ?? 0),
    placementChanged: Boolean(body['placementChanged']),
  };
}
