// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service that asks, for the entities currently on screen, which of them Klacksy's remediation
 * already handled. A POST although it reads: one id per visible row overruns the URL length limit long
 * before it reaches the server's own cap.
 * @param entityIds - Ids of the shifts currently visible; the server answers only for those the caller
 * is allowed to see and returns an empty list rather than an error for the rest.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { IProactiveShiftAttribution } from 'src/app/domain/models/assistant/proactive-shift-attribution.interface';

@Injectable({ providedIn: 'root' })
export class DataProactiveAttributionService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getByEntityIds(entityIds: string[]): Observable<IProactiveShiftAttribution[]> {
    if (entityIds.length === 0) {
      return of([]);
    }

    return this.httpClient
      .post<IProactiveShiftAttribution[]>(
        `${this.baseUrl}proactive-conditions/attributions`,
        { entityIds },
        { context: new HttpContext().set(SKIP_LOADING, true) }
      )
      .pipe(
        retry(2),
        catchError(() => of([]))
      );
  }
}
