// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching and dismissing LLM model sync notifications.
 * Checks unread notifications after login and shows toasts for each provider change.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ILLMSyncNotification } from 'src/app/domain/models/assistant/llm-sync-notification.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class DataSyncNotificationService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastShowService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = `${environment.baseAssistantUrl}sync-notifications`;

  async checkAndShow(): Promise<void> {
    if (!this.auth.isAdminUser()) return;

    try {
      const notifications = await firstValueFrom(
        this.http.get<ILLMSyncNotification[]>(this.apiUrl),
      );

      if (!notifications.length) return;

      for (const n of notifications) {
        if (n.newModelsCount > 0) {
          this.toast.showInfo(
            this.translate.instant('llm.sync.newModels', {
              provider: n.providerName,
              count: n.newModelsCount,
              names: n.newModelNames.join(', '),
            }),
          );
        }
        if (n.deactivatedModelsCount > 0) {
          this.toast.showInfo(
            this.translate.instant('llm.sync.deactivatedModels', {
              provider: n.providerName,
              count: n.deactivatedModelsCount,
              names: n.deactivatedModelNames.join(', '),
            }),
          );
        }
      }

      await firstValueFrom(this.http.post<void>(`${this.apiUrl}/mark-read`, {}));
    } catch {
      // Notification check is non-critical — silent failure
    }
  }
}
