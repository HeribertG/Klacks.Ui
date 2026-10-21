// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the auto-update backend domain (api/backend/update).
 * Provides status/history/config reads and trigger/rollback/cancel actions for the admin Updates card.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { IUpdateHistoryItem } from '../../../domain/models/settings/update-history-item.interface';
import { IUpdateStatus } from '../../../domain/models/settings/update-status.interface';
import { IUpdateTriggerResult } from '../../../domain/models/settings/update-trigger-result.interface';
import { IUpdateConfig } from '../../../domain/models/settings/update-config.interface';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataUpdateService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}update`;

  getStatus(): Observable<IUpdateStatus> {
    return this.httpClient.get<IUpdateStatus>(`${this.baseUrl}/Status`).pipe(retry(3));
  }

  getHistory(take = 10): Observable<IUpdateHistoryItem[]> {
    return this.httpClient.get<IUpdateHistoryItem[]>(`${this.baseUrl}/History?take=${take}`).pipe(retry(3));
  }

  getConfig(): Observable<IUpdateConfig> {
    return this.httpClient.get<IUpdateConfig>(`${this.baseUrl}/Config`).pipe(retry(3));
  }

  saveConfig(config: IUpdateConfig): Observable<IUpdateConfig> {
    return this.httpClient.put<IUpdateConfig>(`${this.baseUrl}/Config`, config).pipe(retry(1));
  }

  triggerUpdate(): Observable<IUpdateTriggerResult> {
    return this.httpClient.post<IUpdateTriggerResult>(`${this.baseUrl}/Trigger`, {});
  }

  rollbackUpdate(): Observable<IUpdateTriggerResult> {
    return this.httpClient.post<IUpdateTriggerResult>(`${this.baseUrl}/Rollback`, {});
  }

  cancelUpdate(id: string): Observable<void> {
    return this.httpClient.post<void>(`${this.baseUrl}/${id}/Cancel`, {});
  }

  deleteHistoryEntry(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${id}`);
  }
}
