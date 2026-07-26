// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Checks unread LLM model sync notifications after login and shows a toast
 * for each provider change, restricted to admin users.
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DataSyncNotificationService } from 'src/app/infrastructure/api/assistant/data-sync-notification.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class SyncNotificationToastService {
  private readonly dataSyncNotification = inject(DataSyncNotificationService);
  private readonly toast = inject(ToastShowService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);

  async checkAndShow(): Promise<void> {
    if (!this.auth.isAdminUser()) return;

    try {
      const notifications = await this.dataSyncNotification.fetchUnread();

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

      await this.dataSyncNotification.markRead();
    } catch {
      // Notification check is non-critical — silent failure
    }
  }
}
