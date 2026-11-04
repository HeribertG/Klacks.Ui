// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the error code of a coded 400 refusal; anything else (another status, no code, an empty body) gives null.
 * @param error - The failed response
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export function readRefusalCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.BadRequest) {
    return null;
  }

  const code = (error.error as { errorCode?: unknown } | null)?.errorCode;
  return typeof code === 'string' ? code : null;
}
