// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for communication with the AnalyseScenarios backend endpoint.
 * @param groupId - Group ID for filtering scenarios
 * @param id - Scenario ID for individual queries and actions
 * @param request - Request object for creating a new scenario
 * @param overrides - Acknowledgements for accept (supervisor compliance override, stale-scenario overwrite)
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, of, retry, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  IAnalyseScenario,
  ICreateAnalyseScenarioRequest,
} from 'src/app/domain/models/schedule/analyse-scenario-class';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { IScenarioAcceptOverrides } from 'src/app/domain/interfaces/scenario-accept-overrides.interface';
import { NO_SCENARIO_ACCEPT_OVERRIDES } from 'src/app/domain/models/schedule/scenario-stale.model';

const OVERRIDE_BLOCK_PARAM = 'overrideBlock';
const OVERRIDE_STALE_PARAM = 'overrideStale';

@Injectable({
  providedIn: 'root',
})
export class DataAnalyseScenarioService {
  private httpClient = inject(HttpClient);
  private baseUrl = environment.baseUrl + 'AnalyseScenarios';

  getByGroup(groupId?: string): Observable<IAnalyseScenario[]> {
    const url = groupId ? `${this.baseUrl}?groupId=${groupId}` : this.baseUrl;
    return this.httpClient
      .get<IAnalyseScenario[]>(url)
      .pipe(retry(3));
  }

  get(id: string): Observable<IAnalyseScenario> {
    return this.httpClient
      .get<IAnalyseScenario>(`${this.baseUrl}/${id}`)
      .pipe(retry(3));
  }

  getSummary(id: string): Observable<ScenarioSummary> {
    return this.httpClient.get<ScenarioSummary>(`${this.baseUrl}/${id}/Summary`).pipe(
      retry({
        count: 3,
        delay: (error: unknown) =>
          error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound
            ? throwError(() => error)
            : of(null),
      }),
    );
  }

  create(request: ICreateAnalyseScenarioRequest): Observable<IAnalyseScenario> {
    return this.httpClient
      .post<IAnalyseScenario>(this.baseUrl, request)
      .pipe(retry(3));
  }

  accept(id: string, overrides: IScenarioAcceptOverrides = NO_SCENARIO_ACCEPT_OVERRIDES): Observable<void> {
    const flags = [
      overrides.overrideBlock ? `${OVERRIDE_BLOCK_PARAM}=true` : null,
      overrides.overrideStale ? `${OVERRIDE_STALE_PARAM}=true` : null,
    ].filter((flag): flag is string => flag !== null);
    const query = flags.length > 0 ? `?${flags.join('&')}` : '';
    return this.httpClient.post<void>(`${this.baseUrl}/${id}/Accept${query}`, {}).pipe(
      retry({
        count: 3,
        delay: (error: unknown) =>
          error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict
            ? throwError(() => error)
            : of(null),
      }),
    );
  }

  reject(id: string): Observable<void> {
    return this.httpClient
      .post<void>(`${this.baseUrl}/${id}/Reject`, {})
      .pipe(retry(3));
  }

  delete(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(retry(3));
  }

  deleteAll(groupId?: string): Observable<void> {
    const url = groupId ? `${this.baseUrl}?groupId=${groupId}` : this.baseUrl;
    return this.httpClient.delete<void>(url).pipe(retry(3));
  }

  rename(id: string, name: string): Observable<IAnalyseScenario> {
    return this.httpClient
      .patch<IAnalyseScenario>(`${this.baseUrl}/${id}/Rename`, { name })
      .pipe(retry(3));
  }
}
