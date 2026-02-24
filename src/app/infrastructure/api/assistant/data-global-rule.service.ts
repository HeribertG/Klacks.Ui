// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IGlobalAgentRule } from 'src/app/domain/interfaces/global-agent-rule.interface';
import { IGlobalAgentRuleHistory } from 'src/app/domain/interfaces/global-agent-rule-history.interface';
import { IUpsertGlobalRuleRequest } from 'src/app/domain/interfaces/upsert-global-rule-request.interface';

@Injectable({
  providedIn: 'root',
})
export class DataGlobalRuleService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}assistant/global-rules`;

  getAll(): Observable<IGlobalAgentRule[]> {
    return this.httpClient
      .get<IGlobalAgentRule[]>(this.baseUrl)
      .pipe(retry(3));
  }

  upsert(
    name: string,
    request: IUpsertGlobalRuleRequest,
  ): Observable<{ name: string; version: number }> {
    return this.httpClient
      .put<{ name: string; version: number }>(
        `${this.baseUrl}/${encodeURIComponent(name)}`,
        request,
      )
      .pipe(retry(3));
  }

  deactivate(name: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.baseUrl}/${encodeURIComponent(name)}`)
      .pipe(retry(3));
  }

  getHistory(limit = 50): Observable<IGlobalAgentRuleHistory[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.httpClient
      .get<IGlobalAgentRuleHistory[]>(`${this.baseUrl}/history`, { params })
      .pipe(retry(3));
  }
}
