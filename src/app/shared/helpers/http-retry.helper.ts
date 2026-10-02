// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Retry operator for HTTP calls that repeats only transient failures. A request the server has
 * rejected on its merits (4xx such as 400/403/409) fails the same way every time, so repeating it
 * only multiplies the request and every error toast the interceptor raises for it.
 * @param count - Number of retries after the first attempt
 * @param error - Error emitted by the source observable
 */

import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, of, retry, throwError } from 'rxjs';

export const HTTP_RETRY_COUNT = 3;

const NETWORK_FAILURE_STATUS = 0;
const SERVER_ERROR_MIN_STATUS = 500;
const REQUEST_TIMEOUT_STATUS = 408;
const TOO_MANY_REQUESTS_STATUS = 429;

export function isTransientHttpError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  return (
    error.status === NETWORK_FAILURE_STATUS ||
    error.status >= SERVER_ERROR_MIN_STATUS ||
    error.status === REQUEST_TIMEOUT_STATUS ||
    error.status === TOO_MANY_REQUESTS_STATUS
  );
}

export function retryTransientHttpErrors<T>(count: number = HTTP_RETRY_COUNT): MonoTypeOperatorFunction<T> {
  return retry<T>({
    count,
    delay: (error: unknown) => (isTransientHttpError(error) ? of(null) : throwError(() => error)),
  });
}
