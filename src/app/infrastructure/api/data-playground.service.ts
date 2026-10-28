// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for the anonymous playground status endpoint.
 * @param getStatus - Reads whether the daily token limit is active; sends the stored device token so the server does not mint a new one. Runs without the global spinner. Only network and server failures are retried; a client error such as 404 from an older backend costs a single request
 */
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { retry } from 'rxjs/operators';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import {
  PLAYGROUND_DEVICE_HEADER,
  PLAYGROUND_STATUS_PATH,
  PLAYGROUND_STATUS_RETRY_COUNT,
} from 'src/app/domain/constants/playground.constants';
import { isPlaygroundStatusUnknownError } from 'src/app/domain/helpers/playground-token-limit.helper';
import { PlaygroundStatus } from 'src/app/domain/models/playground/playground-status.interface';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class DataPlaygroundService {
  private httpClient = inject(HttpClient);

  getStatus(storedDeviceToken: string | null): Observable<PlaygroundStatus> {
    const headers = storedDeviceToken
      ? new HttpHeaders({ [PLAYGROUND_DEVICE_HEADER]: storedDeviceToken })
      : new HttpHeaders();
    return this.httpClient
      .get<PlaygroundStatus>(`${environment.baseUrl}${PLAYGROUND_STATUS_PATH}`, {
        headers,
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(
        retry({
          count: PLAYGROUND_STATUS_RETRY_COUNT,
          delay: (error: unknown) => (isPlaygroundStatusUnknownError(error) ? of(null) : throwError(() => error)),
        }),
      );
  }
}
