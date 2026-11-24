// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the auto-update backend domain (api/backend/update).
 * Provides status/history/config reads and trigger/rollback/cancel actions for the admin Updates card. The engine upgrade
 * answers a refusal with 409 and the blocked reason, which is returned as a normal result instead of an error.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, catchError, of, retry, throwError } from 'rxjs';
import { IUpdateHistoryItem } from '../../../domain/models/settings/update-history-item.interface';
import { IUpdateStatus } from '../../../domain/models/settings/update-status.interface';
import { IUpdateTriggerResult } from '../../../domain/models/settings/update-trigger-result.interface';
import { IUpdateConfig } from '../../../domain/models/settings/update-config.interface';
import { IEngineUpgradeTriggerResult } from '../../../domain/models/settings/engine-upgrade-trigger-result.interface';
import { ENGINE_UPGRADE_API_PATH } from 'src/app/domain/constants/engine-upgrade.constants';
import { environment } from 'src/environments/environment';
import { retryTransientHttpErrors } from 'src/app/infrastructure/helpers/http-retry.helper';

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
    return this.httpClient.put<IUpdateConfig>(`${this.baseUrl}/Config`, config).pipe(retryTransientHttpErrors(1));
  }

  triggerUpdate(): Observable<IUpdateTriggerResult> {
    return this.httpClient.post<IUpdateTriggerResult>(`${this.baseUrl}/Trigger`, {});
  }

  rollbackUpdate(): Observable<IUpdateTriggerResult> {
    return this.httpClient.post<IUpdateTriggerResult>(`${this.baseUrl}/Rollback`, {});
  }

  startEngineUpgrade(): Observable<IEngineUpgradeTriggerResult> {
    return this.httpClient
      .post<IEngineUpgradeTriggerResult>(`${environment.baseUrl}${ENGINE_UPGRADE_API_PATH}`, null)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict && error.error
            ? of<IEngineUpgradeTriggerResult>(error.error)
            : throwError(() => error),
        ),
      );
  }

  cancelUpdate(id: string): Observable<void> {
    return this.httpClient.post<void>(`${this.baseUrl}/${id}/Cancel`, {});
  }

  deleteHistoryEntry(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${id}`);
  }
}
