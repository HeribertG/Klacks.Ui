// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching the full LLM model sync history including per-model test results.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ILLMSyncLogEntry } from 'src/app/domain/models/assistant/llm-sync-log.interface';

@Injectable({ providedIn: 'root' })
export class DataSyncLogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseAssistantUrl}sync-notifications/history`;

  getHistory(): Observable<ILLMSyncLogEntry[]> {
    return this.http.get<ILLMSyncLogEntry[]>(this.apiUrl);
  }
}
