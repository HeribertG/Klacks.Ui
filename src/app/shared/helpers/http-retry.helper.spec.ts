// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { HTTP_RETRY_COUNT, isTransientHttpError, retryTransientHttpErrors } from './http-retry.helper';

function failingSource(status: number, succeedOnAttempt: number | null = null): { source: Observable<string>; attempts: () => number } {
  let attempts = 0;
  const source = new Observable<string>((subscriber) => {
    attempts++;
    if (succeedOnAttempt !== null && attempts >= succeedOnAttempt) {
      subscriber.next('ok');
      subscriber.complete();
      return;
    }
    subscriber.error(new HttpErrorResponse({ status }));
  });
  return { source, attempts: () => attempts };
}

describe('http-retry.helper', () => {
  describe('isTransientHttpError', () => {
    it.each([0, 500, 502, 503, 504, 408, 429])('treats status %i as transient', (status) => {
      expect(isTransientHttpError(new HttpErrorResponse({ status }))).toBe(true);
    });

    it.each([400, 401, 403, 404, 409, 422])('treats status %i as final', (status) => {
      expect(isTransientHttpError(new HttpErrorResponse({ status }))).toBe(false);
    });

    it('treats a non-http error as final', () => {
      expect(isTransientHttpError(new Error('boom'))).toBe(false);
    });
  });

  describe('retryTransientHttpErrors', () => {
    it('sends a rejected request (409) only once', async () => {
      const { source, attempts } = failingSource(409);

      await new Promise<void>((resolve) => {
        source.pipe(retryTransientHttpErrors()).subscribe({ error: () => resolve() });
      });

      expect(attempts()).toBe(1);
    });

    it('retries a server error up to the retry count and then fails', async () => {
      const { source, attempts } = failingSource(500);

      await new Promise<void>((resolve) => {
        source.pipe(retryTransientHttpErrors()).subscribe({ error: () => resolve() });
      });

      expect(attempts()).toBe(HTTP_RETRY_COUNT + 1);
    });

    it('delivers the value of a retry that succeeds', async () => {
      const { source, attempts } = failingSource(503, 3);

      const value = await new Promise<string>((resolve) => {
        source.pipe(retryTransientHttpErrors()).subscribe({ next: resolve });
      });

      expect(value).toBe('ok');
      expect(attempts()).toBe(3);
    });

    it('passes the original error through when it is final', async () => {
      const error = new HttpErrorResponse({ status: 409 });

      const received = await new Promise<unknown>((resolve) => {
        throwError(() => error).pipe(retryTransientHttpErrors()).subscribe({ error: resolve });
      });

      expect(received).toBe(error);
    });
  });
});
