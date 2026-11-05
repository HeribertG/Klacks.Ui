// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells a failed request whose server could not be reached from an answer of the server: no answer at all, or a gateway
 * failure of the own API. A gateway failure of a foreign host says nothing about the own backend.
 * @param error - The error of the request
 * @param apiBaseUrl - Configured base URL of the own API
 * @param pageOrigin - Origin of the page; a same-origin path below /api/ is the own API as well
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { isInternalApiUrl } from './internal-api-url.helper';

const NO_ANSWER_STATUS = 0;
const GATEWAY_FAILURE_STATUS_CODES: readonly number[] = [HttpStatusCode.BadGateway, HttpStatusCode.GatewayTimeout];

export function isBackendUnreachableError(
  error: unknown,
  apiBaseUrl: string,
  pageOrigin: string = window.location.origin,
): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  return (
    error.status === NO_ANSWER_STATUS ||
    (GATEWAY_FAILURE_STATUS_CODES.includes(error.status) && isInternalApiUrl(error.url ?? '', apiBaseUrl, pageOrigin))
  );
}
