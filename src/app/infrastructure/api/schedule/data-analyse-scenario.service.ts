// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for communication with the AnalyseScenarios backend endpoint.
 * @param groupId - Group ID for filtering scenarios
 * @param id - Scenario ID for individual queries and actions
 * @param request - Request object for creating a new scenario
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, of, retry, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  IAnalyseScenario,
  ICreateAnalyseScenarioRequest,
} from 'src/app/domain/models/schedule/analyse-scenario-class';

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

  create(request: ICreateAnalyseScenarioRequest): Observable<IAnalyseScenario> {
    return this.httpClient
      .post<IAnalyseScenario>(this.baseUrl, request)
      .pipe(retry(3));
  }

  accept(id: string, overrideBlock = false): Observable<void> {
    const url = overrideBlock
      ? `${this.baseUrl}/${id}/Accept?overrideBlock=true`
      : `${this.baseUrl}/${id}/Accept`;
    return this.httpClient.post<void>(url, {}).pipe(
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
