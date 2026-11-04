// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the error code of a coded refusal. readErrorCode takes any status; readRefusalCode only the given status
 * (default 400). Anything else (another status, no code, an empty body) gives null.
 * @param error - The failed response
 * @param status - The status the refusal must have
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export function readErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const code = (error.error as { errorCode?: unknown } | null)?.errorCode;
  return typeof code === 'string' ? code : null;
}

export function readRefusalCode(error: unknown, status: HttpStatusCode = HttpStatusCode.BadRequest): string | null {
  return error instanceof HttpErrorResponse && error.status === status ? readErrorCode(error) : null;
}
