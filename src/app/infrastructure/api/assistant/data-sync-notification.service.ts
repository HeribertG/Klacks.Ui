// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for fetching and dismissing LLM model sync notifications.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ILLMSyncNotification } from 'src/app/domain/models/assistant/llm-sync-notification.interface';

@Injectable({ providedIn: 'root' })
export class DataSyncNotificationService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.baseAssistantUrl}sync-notifications`;

  fetchUnread(): Promise<ILLMSyncNotification[]> {
    return firstValueFrom(this.http.get<ILLMSyncNotification[]>(this.apiUrl));
  }

  markRead(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.apiUrl}/mark-read`, {}));
  }
}
