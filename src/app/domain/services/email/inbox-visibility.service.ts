// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, computed } from '@angular/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Injectable({
  providedIn: 'root',
})
export class InboxVisibilityService {
  private appSettingsService = inject(AppSettingsManagementService);

  public isAvailable = computed(() => {
    //const imap = this.appSettingsService.imapSettings();
    //return !!imap.server?.trim() && !!imap.username?.trim() && !!imap.password?.trim();
    return true;
  });

  public async ensureSettingsLoaded(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
  }
}
