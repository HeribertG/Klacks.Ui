// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Classifies a failed token refresh: only 400/401 mean the server rejected the refresh credential, while a network
 * failure or a server error leaves a still-recoverable session alone.
 * @param error - Error emitted by the refresh request
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export function isRefreshTokenRejection(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === HttpStatusCode.BadRequest || error.status === HttpStatusCode.Unauthorized)
  );
}
