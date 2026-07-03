// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP service for managing ERP import tokens scoped to a single drop point.
 * @param getTokens - Loads all token metadata for the given drop point
 * @param createToken - Creates a new token and returns the plaintext token exactly once
 * @param revokeToken - Revokes (deletes) the token with the given id for the given drop point
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IErpImportToken,
  IErpImportTokenCreate,
  IErpImportTokenCreated,
} from 'src/app/domain/models/settings/erp-import-token';

@Injectable({
  providedIn: 'root',
})
export class DataErpImportTokenService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}erp-import-tokens`;

  getTokens(dropPointId: string): Observable<IErpImportToken[]> {
    const params = new HttpParams().set('dropPointId', dropPointId);
    return this.httpClient
      .get<IErpImportToken[]>(this.apiUrl, { params })
      .pipe(retry(3));
  }

  createToken(request: IErpImportTokenCreate): Observable<IErpImportTokenCreated> {
    return this.httpClient.post<IErpImportTokenCreated>(this.apiUrl, request);
  }

  revokeToken(id: string, dropPointId: string): Observable<void> {
    const params = new HttpParams().set('dropPointId', dropPointId);
    return this.httpClient
      .delete<void>(`${this.apiUrl}/${id}`, { params })
      .pipe(retry(3));
  }
}
