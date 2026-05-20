// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching the full LLM model sync history and triggering manual sync checks.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ILLMSyncLogEntry } from 'src/app/domain/models/assistant/llm-sync-log.interface';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

const skipLoading = { context: new HttpContext().set(SKIP_LOADING, true) };

@Injectable({ providedIn: 'root' })
export class DataSyncLogService {
  private readonly http = inject(HttpClient);
  private readonly historyUrl = `${environment.baseAssistantUrl}sync-notifications/history`;
  private readonly triggerUrl = `${environment.baseAssistantUrl}sync-notifications/trigger`;

  getHistory(): Observable<ILLMSyncLogEntry[]> {
    return this.http.get<ILLMSyncLogEntry[]>(this.historyUrl, skipLoading);
  }

  triggerSync(): Observable<void> {
    return this.http.post<void>(this.triggerUrl, null, skipLoading);
  }
}
