// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Drops a create request that is identical (same url and serialized body) to one still in flight, so a double click
 * sends one request instead of two. The dropped call completes without a value; once the first request has answered
 * or failed, an identical create is sent again. The check runs when the returned observable is subscribed.
 * @param inFlight - Url and serialized body of the create requests currently running
 */

import { Injectable } from '@angular/core';
import { defer, EMPTY, finalize, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IdenticalCreateGuardService {
  private readonly inFlight = new Set<string>();

  /**
   * @param url - Url of the create request
   * @param body - Wire payload of the create request
   * @param send - Sends the request; called only when no identical create is in flight
   */
  run<T>(url: string, body: unknown, send: () => Observable<T>): Observable<T> {
    return defer(() => {
      const key = `${url} ${JSON.stringify(body)}`;
      if (this.inFlight.has(key)) {
        return EMPTY;
      }

      const request$ = send();
      this.inFlight.add(key);
      return request$.pipe(finalize(() => this.inFlight.delete(key)));
    });
  }
}
