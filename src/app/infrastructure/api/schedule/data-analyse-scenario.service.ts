// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API-Service fuer die Kommunikation mit dem AnalyseScenarios-Backend-Endpoint.
 * @param groupId - Gruppen-ID zum Filtern der Szenarien
 * @param id - Szenario-ID fuer Einzelabfragen und Aktionen
 * @param request - Request-Objekt zum Erstellen eines neuen Szenarios
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
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

  getByGroup(groupId: string): Observable<IAnalyseScenario[]> {
    return this.httpClient
      .get<IAnalyseScenario[]>(`${this.baseUrl}?groupId=${groupId}`)
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

  accept(id: string): Observable<void> {
    return this.httpClient
      .post<void>(`${this.baseUrl}/${id}/Accept`, {})
      .pipe(retry(3));
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
}
